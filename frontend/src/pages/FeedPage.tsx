import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type Item } from '../lib/api'
import { Button, EmptyState, PageHeader, StateBox } from '../components/ui'
import { FeedRow } from '../components/FeedRow'
import { FetchProgressPanel } from '../components/FetchProgressPanel'
import { FetchResultSummary } from '../components/FetchResultSummary'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
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
  const locale = dateLocale(i18n.language)

  const [range, setRange] = useState<Range>('7d')
  const [searchParams, setSearchParams] = useSearchParams()
  const sourceType = searchParams.get('sourceType') ?? ''
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [q, setQ] = useState('')
  const [inputQ, setInputQ] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
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

  const feedQuery = useQuery({
    queryKey: ['feed', range, sourceType, unreadOnly, page],
    queryFn: () => {
      const parts = [`sort=score`, `limit=${PAGE}`, `offset=${offset}`]
      if (since) parts.push(`since=${encodeURIComponent(since)}`)
      if (unreadOnly) parts.push('unread=true')
      if (sourceType) parts.push(`sourceType=${encodeURIComponent(sourceType)}`)
      return api.items(`?${parts.join('&')}`)
    },
  })

  const searchQuery = useQuery({
    queryKey: ['feed-search', q],
    queryFn: () => api.searchItems(q, 60),
    enabled: searchMode,
  })

  const items: Item[] = searchMode ? searchQuery.data?.items ?? [] : feedQuery.data?.items ?? []
  const total = searchMode ? searchQuery.data?.items.length ?? 0 : feedQuery.data?.total ?? 0

  useEffect(() => setPage(1), [range, sourceType, unreadOnly])
  useEffect(() => {
    if (items.length && selectedId == null) setSelectedId(items[0].id)
  }, [items, selectedId])

  const { fetchJob, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['feed'],
    ['sources'],
    ['intelligence-home'],
    ['watching'],
  ])

  const patch = useMutation({
    mutationFn: ({ id, read, saved }: { id: number; read?: boolean; saved?: boolean }) =>
      api.patchItem(id, { read, saved }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feed'] })
      void qc.invalidateQueries({ queryKey: ['watching'] })
    },
  })
  const markAll = useMutation({
    mutationFn: api.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  })

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
      } else if (e.key === 'o' || e.key === 'Enter') {
        const cur = items[idx]
        if (cur) window.open(cur.canonicalUrl, '_blank', 'noopener')
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
  }, [items, selectedId, patch, focusSearch])

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
            <Button variant="ghost" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              {t('feed.markAllRead')}
            </Button>
          </>
        }
      />

      {phase === 'running' ? <FetchProgressPanel progress={progress} /> : null}
      {phase === 'summary' ? <FetchResultSummary progress={progress} onDismiss={() => void dismiss()} /> : null}

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <input
            id="feed-search-input"
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setQ(inputQ)
              if (e.key === 'Escape') {
                setInputQ('')
                setQ('')
              }
            }}
            placeholder={t('feed.searchPlaceholder')}
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
          />
          <kbd className="absolute right-2 top-2">/</kbd>
        </div>
        <div className="flex rounded-md border border-border bg-surface p-0.5">
          {(['24h', '7d', '30d', 'all'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-2 py-1 text-xs font-medium ${range === r ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}
            >
              {t(`feed.range.${r}`)}
            </button>
          ))}
        </div>
        <select
          value={sourceType}
          onChange={(e) => {
            const v = e.target.value
            if (v) setSearchParams({ sourceType: v }, { replace: true })
            else setSearchParams({}, { replace: true })
          }}
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
        >
          <option value="">{t('feed.allSources')}</option>
          {channelTypes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={() => setUnreadOnly((v) => !v)}
          className={`h-9 rounded-md border px-3 text-sm ${unreadOnly ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-surface text-muted'}`}
        >
          {t('feed.unreadOnly')}
        </button>
        <span className="font-mono text-xs text-muted">
          {searchMode ? t('feed.searchingFor', { q }) : t('feed.count', { count: total })}
          {unreadCount > 0 && !unreadOnly ? ` · ${t('feed.unreadInline', { count: unreadCount })}` : ''}
        </span>
      </div>

      {/* List */}
      {feedQuery.isLoading && !searchMode ? (
        <StateBox>{t('common.loading')}</StateBox>
      ) : null}
      {searchMode && searchQuery.isLoading ? <StateBox>{t('common.loading')}</StateBox> : null}
      {items.length === 0 && !feedQuery.isLoading ? (
        <EmptyState
          title={searchMode ? t('feed.noSearchResult') : t('feed.empty')}
          description={searchMode ? t('feed.noSearchResultHint') : t('feed.emptyHint')}
          primary={
            <Button onClick={runFetch}>{t('common.fetchNow')}</Button>
          }
        />
      ) : null}

      {items.length > 0 ? (
        <div ref={listRef} className="rounded-lg border border-border bg-surface">
          {items.map((item) => (
            <div key={item.id} className="border-b border-border/60 last:border-0">
              <FeedRow
                item={item}
                selected={item.id === selectedId}
                onSelect={() => setSelectedId(item.id)}
                locale={locale}
                onToggleSaved={() => patch.mutate({ id: item.id, saved: !item.saved })}
                onMarkRead={() => patch.mutate({ id: item.id, read: true })}
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
            <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {t('feed.prev')}
            </Button>
            <Button variant="ghost" disabled={page >= Math.ceil(total / PAGE)} onClick={() => setPage((p) => p + 1)}>
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
