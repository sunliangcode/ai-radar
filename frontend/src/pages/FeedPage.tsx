import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type Item } from '../lib/api'
import { Button, ConfirmDialog, EmptyState, ListSkeleton, PageHeader, StateBox, useToast } from '../components/ui'
import { FeedRow } from '../components/FeedRow'
import { FetchProgressPanel } from '../components/FetchProgressPanel'
import { FetchResultSummary } from '../components/FetchResultSummary'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { patchFeedItemInCache, useMarkItemRead } from '../hooks/useMarkItemRead'
import { dateLocale } from '../i18n'

type Range = '24h' | '7d' | '30d' | 'all'

function sinceIso(range: Range): string | undefined {
  if (range === 'all') return undefined
  const now = Date.now()
  const ms = range === '24h' ? 86400_000 : range === '7d' ? 7 * 86400_000 : 30 * 86400_000
  return new Date(now - ms).toISOString()
}

const PAGE = 40

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

  const sources = useQuery({ queryKey: ['sources'], queryFn: api.sources })
  const connectors = useQuery({ queryKey: ['connectors'], queryFn: api.connectors })

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

  const items: Item[] = searchMode ? searchQuery.data?.items ?? [] : feedQuery.data?.items ?? []
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

  // Global keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const idx = items.findIndex((i) => i.id === selectedId)
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        const next = items[Math.min(items.length - 1, idx + 1)]
        if (next) setSelectedId(next.id)
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = items[Math.max(0, idx - 1)]
        if (prev) setSelectedId(prev.id)
      } else if (e.key === 'o') {
        const cur = items[idx]
        if (cur) {
          e.preventDefault()
          setExpandSignals((m) => ({ ...m, [cur.id]: (m[cur.id] ?? 0) + 1 }))
        }
      } else if (e.key === 'Enter') {
        const cur = items[idx]
        if (cur) openExternalAndMarkRead(cur)
      } else if (e.key === 's') {
        const cur = items[idx]
        if (cur) patch.mutate({ id: cur.id, saved: !cur.saved })
      } else if (e.key === 'm') {
        const cur = items[idx]
        if (cur && !cur.read) patch.mutate({ id: cur.id, read: true })
      } else if (e.key === '/') {
        e.preventDefault()
        focusSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items, selectedId, patch, focusSearch, openExternalAndMarkRead])

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

      {phase === 'running' ? <FetchProgressPanel progress={progress} /> : null}
      {phase === 'summary' ? (
        <FetchResultSummary
          progress={progress}
          onDismiss={() => void dismiss()}
          retrying={retryFailed.isPending}
          onRetryFailed={(types) => retryFailed.mutate(types)}
        />
      ) : null}

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <input
            id="feed-search-input"
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setInputQ('')
                setQ('')
              }
            }}
            placeholder={t('feed.searchPlaceholder')}
            className="h-9 w-full rounded-md border border-border bg-surface px-3 pr-8 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
          {inputQ ? (
            <button
              type="button"
              aria-label={t('feed.clearSearch')}
              onClick={() => {
                setInputQ('')
                setQ('')
                document.getElementById('feed-search-input')?.focus()
              }}
              className="absolute right-2 top-1.5 flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-mist hover:text-ink"
            >
              ×
            </button>
          ) : (
            <kbd className="absolute right-2 top-2">/</kbd>
          )}
        </div>
        <div
          className={`flex rounded-md border border-border bg-surface p-0.5 ${searchMode ? 'pointer-events-none opacity-45' : ''}`}
          title={searchMode ? t('feed.searchFiltersDisabled') : undefined}
        >
          {(['24h', '7d', '30d', 'all'] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              disabled={searchMode}
              onClick={() => setRange(r)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${range === r ? 'bg-accent text-white' : 'text-muted hover:text-ink'}`}
            >
              {t(`feed.range.${r}`)}
            </button>
          ))}
        </div>
        <select
          value={sourceType}
          disabled={searchMode}
          title={searchMode ? t('feed.searchFiltersDisabled') : undefined}
          onChange={(e) => {
            const v = e.target.value
            if (v) setSearchParams({ sourceType: v }, { replace: true })
            else setSearchParams({}, { replace: true })
          }}
          className={`h-9 rounded-md border border-border bg-surface px-2 text-sm ${searchMode ? 'opacity-45' : ''}`}
        >
          <option value="">{t('feed.allSources')}</option>
          {channelTypes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={searchMode}
          title={searchMode ? t('feed.searchFiltersDisabled') : undefined}
          onClick={() => setUnreadOnly((v) => !v)}
          className={`h-9 rounded-md border px-3 text-xs font-medium transition ${
            searchMode ? 'opacity-45' : ''
          } ${unreadOnly ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-muted hover:text-ink'}`}
        >
          {t('feed.unreadOnly')}
        </button>
        <span className="font-mono text-xs text-muted">
          {searchMode ? t('feed.searchingFor', { q }) : t('feed.count', { count: total })}
          {unreadCount > 0 && !unreadOnly ? ` · ${t('feed.unreadInline', { count: unreadCount })}` : ''}
        </span>
      </div>
      {searchMode ? (
        <p className="mb-3 text-xs text-muted">{t('feed.searchFiltersDisabled')}</p>
      ) : null}

      {channelTypes.length > 0 ? (
        <div className="mb-3 flex gap-1.5 overflow-x-auto md:hidden" aria-label={t('nav.sources')}>
          <button
            type="button"
            disabled={searchMode}
            onClick={() => setSearchParams({}, { replace: true })}
            className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-mono transition ${
              !sourceType ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-muted'
            } ${searchMode ? 'opacity-45' : ''}`}
          >
            {t('feed.allSources')}
          </button>
          {channelTypes.map((c) => (
            <button
              key={c}
              type="button"
              disabled={searchMode}
              onClick={() => setSearchParams({ sourceType: c }, { replace: true })}
              className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-mono transition ${
                sourceType === c ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-muted'
              } ${searchMode ? 'opacity-45' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}

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
                onToggleSaved={() => patch.mutate({ id: item.id, saved: !item.saved })}
                onMarkRead={() => patch.mutate({ id: item.id, read: true })}
                onNotInterested={() => patch.mutate({ id: item.id, dismissed: true })}
                onOpenExternal={() => markReadOnOpen(item)}
                expandSignal={expandSignals[item.id]}
              />
            </div>
          ))}
        </div>
      ) : null}

      {/* Pagination (only in list mode) */}
      {!searchMode && total > PAGE ? (
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-xs text-muted">
            {t('feed.pageInfo', { page, totalPages: Math.ceil(total / PAGE) })}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={page <= 1} onClick={() => changePage(page - 1)}>
              {t('feed.prev')}
            </Button>
            <Button variant="ghost" disabled={page >= Math.ceil(total / PAGE)} onClick={() => changePage(page + 1)}>
              {t('feed.next')}
            </Button>
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-muted">
        {t('feed.shortcuts')}{' '}
        <kbd>j</kbd> <kbd>k</kbd> <kbd>o</kbd> <kbd>s</kbd> <kbd>m</kbd> <kbd>/</kbd>{' '}
        <kbd>⌘K</kbd>
      </p>
    </div>
  )
}
