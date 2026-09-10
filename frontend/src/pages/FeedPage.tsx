import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type Item } from '../lib/api'
import { Button, ConfirmDialog, EmptyState, ListSkeleton, PageHeader, StateBox, useToast } from '../components/ui'
import { FeedRow } from '../components/FeedRow'
import { FetchProgressSection } from '../components/fetch/FetchProgressSection'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { useSources } from '../hooks/useSources'
import { useConnectors } from '../hooks/useConnectors'
import { patchFeedItemInCache, useMarkItemRead } from '../hooks/useMarkItemRead'
import { dateLocale } from '../i18n'
import { PAGE, sinceIso, type Range } from './feed/feedQuery'
import { FeedToolbar } from './feed/FeedToolbar'
import { FeedPagination } from './feed/FeedPagination'
import { useFeedKeyboard } from './feed/useFeedKeyboard'

export default function FeedPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const locale = dateLocale(i18n.language)

  const [range, setRange] = useState<Range>('7d')
  const [searchParams, setSearchParams] = useSearchParams()
  const sourceType = searchParams.get('sourceType') ?? ''
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [q, setQ] = useState('')
  const [inputQ, setInputQ] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [expandSignals, setExpandSignals] = useState<Record<number, number>>({})
  const [confirmMarkAllOpen, setConfirmMarkAllOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const sources = useSources()
  const connectors = useConnectors()

  const channelTypes = useMemo(() => {
    const set = new Set<string>()
    for (const s of sources.data ?? []) if (s.type) set.add(s.type)
    for (const c of connectors.data ?? []) if (c.id) set.add(c.id)
    return Array.from(set).sort()
  }, [sources.data, connectors.data])

  const searchMode = q.trim().length > 1
  const since = sinceIso(range)
  const offset = (page - 1) * PAGE

  useEffect(() => {
    const trimmed = inputQ.trim()
    if (!trimmed) {
      setQ('')
      return
    }
    const id = window.setTimeout(() => setQ(trimmed), 250)
    return () => window.clearTimeout(id)
  }, [inputQ])

  const { fetchJob, retryFailed, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['feed'],
    ['sources'],
    ['intelligence-home'],
    ['watching'],
  ])

  const feedQuery = useQuery({
    queryKey: ['feed', range, sourceType, unreadOnly, page],
    queryFn: () => {
      const parts = [`sort=score`, `limit=${PAGE}`, `offset=${offset}`]
      if (since) parts.push(`since=${encodeURIComponent(since)}`)
      if (unreadOnly) parts.push('unread=true')
      if (sourceType) parts.push(`sourceType=${encodeURIComponent(sourceType)}`)
      return api.items(`?${parts.join('&')}`)
    },
    refetchInterval: () => (progress?.running ? 1500 : false),
  })

  const searchQuery = useQuery({
    queryKey: ['feed-search', q],
    queryFn: () => api.searchItems(q, 60),
    enabled: searchMode,
  })

  const items: Item[] = useMemo(
    () => (searchMode ? searchQuery.data?.items ?? [] : feedQuery.data?.items ?? []),
    [searchMode, searchQuery.data, feedQuery.data],
  )
  const total = searchMode ? searchQuery.data?.items.length ?? 0 : feedQuery.data?.total ?? 0

  useEffect(() => {
    setPage(1)
    setSelectedId(null)
  }, [range, sourceType, unreadOnly, q])
  useEffect(() => {
    if (items.length && selectedId == null) setSelectedId(items[0].id)
  }, [items, selectedId])

  const patch = useMutation({
    mutationFn: ({
      id,
      read,
      saved,
      dismissed,
    }: {
      id: number
      read?: boolean
      saved?: boolean
      dismissed?: boolean
    }) => api.patchItem(id, { read, saved, dismissed }),
    onSuccess: (_data, vars) => {
      if (vars.dismissed) {
        patchFeedItemInCache(qc, vars.id, { dismissed: true, read: true }, { remove: true })
        void qc.invalidateQueries({ queryKey: ['preference-keywords'] })
        pushToast('success', t('feed.notInterestedDone'))
      } else {
        const patchFields: Partial<Item> = {}
        if (vars.read != null) patchFields.read = vars.read
        if (vars.saved != null) patchFields.saved = vars.saved
        // Keep list order stable; only drop when viewing unread-only and marking read.
        const remove = unreadOnly && vars.read === true
        patchFeedItemInCache(qc, vars.id, patchFields, { remove })
        if (vars.saved) {
          void qc.invalidateQueries({ queryKey: ['preference-keywords'] })
          void qc.invalidateQueries({ queryKey: ['actions'] })
          void qc.invalidateQueries({ queryKey: ['watching'] })
          pushToast('success', t('feed.savedHint'))
        }
      }
      void qc.invalidateQueries({ queryKey: ['unread-counts'] })
    },
  })
  const markAll = useMutation({
    mutationFn: api.markAllRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feed'] })
      void qc.invalidateQueries({ queryKey: ['unread-counts'] })
      pushToast('success', t('feed.markAllReadDone'))
    },
    onError: (err) => {
      pushToast('error', t('common.loadFailed', { message: (err as Error).message }))
    },
  })

  const markItemRead = useMarkItemRead()
  const markItemReadMutate = markItemRead.mutate

  const markReadOnOpen = useCallback(
    (item: Item) => {
      if (!item.read) markItemReadMutate({ id: item.id, read: true })
    },
    [markItemReadMutate],
  )

  const openExternalAndMarkRead = useCallback(
    (item: Item) => {
      if (!item.canonicalUrl) return
      window.open(item.canonicalUrl, '_blank', 'noopener')
      markReadOnOpen(item)
    },
    [markReadOnOpen],
  )

  const changePage = (next: number) => {
    setPage(next)
    setSelectedId(null)
  }

  const focusSearch = useCallback(() => {
    document.getElementById('feed-search-input')?.focus()
  }, [])

  const toggleSaved = useCallback(
    (item: Item) => patch.mutate({ id: item.id, saved: !item.saved }),
    [patch],
  )
  const markItemSelectedRead = useCallback(
    (item: Item) => patch.mutate({ id: item.id, read: true }),
    [patch],
  )
  const expandItem = useCallback(
    (id: number) => setExpandSignals((m) => ({ ...m, [id]: (m[id] ?? 0) + 1 })),
    [],
  )

  // Global keyboard navigation
  useFeedKeyboard({
    items,
    selectedId,
    onSelect: setSelectedId,
    onExpand: expandItem,
    onOpen: openExternalAndMarkRead,
    onToggleSaved: toggleSaved,
    onMarkRead: markItemSelectedRead,
    onFocusSearch: focusSearch,
  })

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-item-id="${selectedId}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  const runFetch = () => {
    fetchJob.mutate(sourceType ? { sourceType } : undefined, {
      onSuccess: async () => {
        await dismiss()
        setPage(1)
        setSelectedId(null)
      },
      onError: () => dismiss(),
    })
  }

  const unreadCount = useMemo(
    () => items.filter((i) => !i.read).length,
    [items],
  )

  const clearSearch = useCallback(() => {
    setInputQ('')
    setQ('')
  }, [])

  const onSourceTypeChange = (v: string) => {
    if (v) setSearchParams({ sourceType: v }, { replace: true })
    else setSearchParams({}, { replace: true })
  }

  return (
    <div>
      <PageHeader
        title={t('feed.title')}
        subtitle={t('feed.subtitle')}
        actions={
          <>
            <Button onClick={runFetch} loading={isPending}>
              {phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmMarkAllOpen(true)} disabled={markAll.isPending}>
              {t('feed.markAllRead')}
            </Button>
          </>
        }
      />

      <ConfirmDialog
        open={confirmMarkAllOpen}
        title={t('feed.markAllReadConfirm')}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          setConfirmMarkAllOpen(false)
          markAll.mutate()
        }}
        onCancel={() => setConfirmMarkAllOpen(false)}
      />

      <FetchProgressSection
        phase={phase}
        progress={progress}
        onDismiss={() => void dismiss()}
        retrying={retryFailed.isPending}
        onRetryFailed={(types) => retryFailed.mutate(types)}
      />

      <FeedToolbar
        inputQ={inputQ}
        onInputChange={setInputQ}
        onClearSearch={clearSearch}
        searchMode={searchMode}
        q={q}
        range={range}
        onRangeChange={setRange}
        sourceType={sourceType}
        onSourceTypeChange={onSourceTypeChange}
        unreadOnly={unreadOnly}
        onToggleUnreadOnly={() => setUnreadOnly((v) => !v)}
        total={total}
        unreadCount={unreadCount}
        channelTypes={channelTypes}
      />

      {/* List */}
      {feedQuery.isLoading && !searchMode ? <ListSkeleton rows={6} /> : null}
      {searchMode && searchQuery.isLoading ? <ListSkeleton rows={4} /> : null}
      {!searchMode && feedQuery.isError ? (
        <StateBox>
          <p className="mb-3">{t('common.loadFailed', { message: (feedQuery.error as Error).message })}</p>
          <Button variant="ghost" onClick={() => void feedQuery.refetch()}>
            {t('common.retry')}
          </Button>
        </StateBox>
      ) : null}
      {searchMode && searchQuery.isError ? (
        <StateBox>
          <p className="mb-3">{t('common.loadFailed', { message: (searchQuery.error as Error).message })}</p>
          <Button variant="ghost" onClick={() => void searchQuery.refetch()}>
            {t('common.retry')}
          </Button>
        </StateBox>
      ) : null}
      {items.length === 0 &&
      !feedQuery.isLoading &&
      !searchQuery.isLoading &&
      !feedQuery.isError &&
      !(searchMode && searchQuery.isError) ? (
        <EmptyState
          title={searchMode ? t('feed.noSearchResult') : t('feed.empty')}
          description={searchMode ? t('feed.noSearchResultHint') : t('feed.emptyHint')}
          primary={<Button onClick={runFetch}>{t('common.fetchNow')}</Button>}
        />
      ) : null}

      {items.length > 0 ? (
        <div ref={listRef}>
          {items.map((item) => (
            <div key={item.id} className="group">
              <FeedRow
                item={item}
                selected={item.id === selectedId}
                onSelect={() => setSelectedId(item.id)}
                locale={locale}
                onToggleSaved={() => toggleSaved(item)}
                onMarkRead={() => markItemSelectedRead(item)}
                onNotInterested={() => patch.mutate({ id: item.id, dismissed: true })}
                onOpenExternal={() => markReadOnOpen(item)}
                expandSignal={expandSignals[item.id]}
              />
            </div>
          ))}
        </div>
      ) : null}

      {/* Pagination (only in list mode) */}
      {!searchMode ? (
        <FeedPagination page={page} total={total} pageSize={PAGE} onChange={changePage} />
      ) : null}

      <p className="mt-4 text-xs text-muted">
        {t('feed.shortcuts')}{' '}
        <kbd>j</kbd> <kbd>k</kbd> <kbd>o</kbd> <kbd>s</kbd> <kbd>m</kbd> <kbd>/</kbd>{' '}
        <kbd>⌘K</kbd>
      </p>
    </div>
  )
}
