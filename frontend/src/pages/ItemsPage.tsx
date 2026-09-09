import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { Button, EmptyState, ItemRow, PageHeader, StateBox } from '../components/ui'
import { FetchProgressPanel } from '../components/FetchProgressPanel'
import { FetchResultSummary } from '../components/FetchResultSummary'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { dateLocale } from '../i18n'

const CHANNEL_PAGE_SIZE = 5
const DEFAULT_PAGE_SIZE = 40

export default function ItemsPage() {
  const { t, i18n } = useTranslation()
  const [sort, setSort] = useState<'score' | 'publishedAt' | 'createdAt'>('score')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [savedOnly, setSavedOnly] = useState(false)
  const [sourceType, setSourceType] = useState('')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()
  const sources = useQuery({ queryKey: ['sources'], queryFn: api.sources })
  const connectors = useQuery({ queryKey: ['connectors'], queryFn: api.connectors })
  const channelTypes = useMemo(() => {
    const types = new Set<string>()
    for (const s of sources.data ?? []) {
      if (s.type) types.add(s.type)
    }
    for (const c of connectors.data ?? []) {
      if (c.id) types.add(c.id)
    }
    return Array.from(types).sort()
  }, [sources.data, connectors.data])

  const channelMode = Boolean(sourceType)
  const pageSize = channelMode ? CHANNEL_PAGE_SIZE : DEFAULT_PAGE_SIZE
  const effectiveSort = channelMode ? 'createdAt' : sort
  const offset = (page - 1) * pageSize

  useEffect(() => {
    setPage(1)
  }, [sourceType, unreadOnly, savedOnly, sort])

  const q =
    `?sort=${effectiveSort}&limit=${pageSize}&offset=${offset}` +
    (unreadOnly ? '&unread=true' : '') +
    (savedOnly ? '&saved=true' : '') +
    (sourceType ? `&sourceType=${encodeURIComponent(sourceType)}` : '')
  const itemsQuery = useQuery({
    queryKey: ['items', effectiveSort, unreadOnly, savedOnly, sourceType, page, pageSize],
    queryFn: () => api.items(q),
  })
  const keywordsQuery = useQuery({
    queryKey: ['interest-keywords'],
    queryFn: api.interestKeywords,
    enabled: savedOnly,
  })
  const items = itemsQuery.data?.items
  const total = itemsQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const locale = dateLocale(i18n.language)
  const keywords = keywordsQuery.data?.keywords ?? []

  const { fetchJob, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['items'],
    ['sources'],
    ['intelligence-home'],
    ['events'],
    ['briefs'],
  ])

  const patch = useMutation({
    mutationFn: ({ id, read, saved }: { id: number; read?: boolean; saved?: boolean }) =>
      api.patchItem(id, { read, saved }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['items'] })
      void qc.invalidateQueries({ queryKey: ['interest-keywords'] })
    },
  })
  const markAll = useMutation({
    mutationFn: api.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  })

  const updateLabel = phase === 'running' ? t('common.fetching') : t('common.fetchNow')

  function runUpdate() {
    fetchJob.mutate(sourceType ? { sourceType } : undefined, {
      onSuccess: async () => {
        await dismiss()
        setPage(1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      onError: async () => {
        await dismiss()
      },
    })
  }

  const updateButton = (
    <Button loading={isPending} onClick={runUpdate}>
      {updateLabel}
    </Button>
  )

  return (
    <div>
      <PageHeader
        title={t('items.title')}
        subtitle={t('items.subtitle')}
        actions={
          <>
            <select
              className="rounded-sm border border-mist bg-paper px-3 py-2 text-sm"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              aria-label={t('items.filterChannel')}
            >
              <option value="">{t('items.allChannels')}</option>
              {channelTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {updateButton}
            {!channelMode ? (
              <Button
                variant="ghost"
                onClick={() => setSort(sort === 'score' ? 'publishedAt' : 'score')}
              >
                {sort === 'score' ? t('items.sortScore') : t('items.sortTime')}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => {
                setSavedOnly((v) => !v)
                if (!savedOnly) setUnreadOnly(false)
              }}
            >
              {savedOnly ? t('items.showAll') : t('items.savedOnly')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setUnreadOnly((v) => !v)
                if (!unreadOnly) setSavedOnly(false)
              }}
            >
              {unreadOnly ? t('items.showAll') : t('items.unreadOnly')}
            </Button>
            <Button variant="ghost" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              {t('items.markAllRead')}
            </Button>
          </>
        }
      />

      {phase === 'running' ? <FetchProgressPanel progress={progress} /> : null}
      {phase === 'summary' ? <FetchResultSummary progress={progress} onDismiss={() => void dismiss()} /> : null}

      {savedOnly && keywords.length > 0 ? (
        <p className="mb-4 text-sm text-muted">
          {t('items.interestKeywordsHint', { keywords: keywords.join('、') })}
        </p>
      ) : null}
      {savedOnly && !keywordsQuery.isLoading && keywords.length === 0 ? (
        <p className="mb-4 text-sm text-muted">{t('items.interestKeywordsEmpty')}</p>
      ) : null}

      {itemsQuery.isLoading ? <StateBox>{t('items.loading')}</StateBox> : null}
      {itemsQuery.isError ? (
        <StateBox>{t('common.loadFailed', { message: (itemsQuery.error as Error).message })}</StateBox>
      ) : null}
      {!itemsQuery.isLoading && items?.length === 0 ? (
        <EmptyState
          title={savedOnly ? t('items.emptySaved') : t('items.empty')}
          description={savedOnly ? t('items.emptySavedHint') : t('items.emptyLink')}
          primary={
            savedOnly ? undefined : (
              <Link to="/sources">
                <Button>{t('nav.sources')}</Button>
              </Link>
            )
          }
          secondary={savedOnly ? undefined : updateButton}
        />
      ) : null}

      {items && items.length > 0 ? (
        <div className="rounded-xl border border-mist bg-paper px-4">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              title={item.title}
              score={item.score}
              summary={item.summary}
              contentSnippet={item.contentSnippet}
              url={item.canonicalUrl}
              meta={[
                item.primarySourceType,
                item.publishedAt ? new Date(item.publishedAt).toLocaleString(locale) : '',
                item.eventId ? `${t('nav.events')} #${item.eventId}` : '',
              ]
                .filter(Boolean)
                .join(' · ')}
              unread={!item.read}
              saved={Boolean(item.saved)}
              onMarkRead={() => patch.mutate({ id: item.id, read: true })}
              onToggleSaved={() => patch.mutate({ id: item.id, saved: !item.saved })}
            />
          ))}
        </div>
      ) : null}

      {total > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              disabled={page <= 1 || isPending}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1))
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              {t('items.prevPage')}
            </Button>
            <span className="font-mono text-sm text-muted">
              {t('items.pageOf', { page, totalPages, total })}
            </span>
            <Button
              variant="ghost"
              disabled={page >= totalPages || isPending}
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1))
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              {t('items.nextPage')}
            </Button>
          </div>
          {updateButton}
        </div>
      ) : null}

      {items?.some((i) => i.eventId) ? (
        <p className="mt-4 text-sm text-muted">
          {t('items.eventHint')}{' '}
          <Link className="text-ink underline" to="/events">
            {t('items.eventHintLink')}
          </Link>{' '}
          {t('items.eventHintSuffix')}
        </p>
      ) : null}
    </div>
  )
}
