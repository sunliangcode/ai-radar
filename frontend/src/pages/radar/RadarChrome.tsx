import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, type ChangeCard } from '../../lib/api'
import { ListSkeleton, PageHeader, QueryErrorState, EmptyState, StatusBadge } from '../../components/ui'
import { useDisplaySources } from '../../hooks/useDisplaySources'
import { changeMatchesDisplay } from '../../lib/sourceFilter'
import { errorText } from '../../lib/errors'
import { cn, focusRingClass } from '../../lib/cn'
import { inputClasses } from '../../components/primitives/Input'

export type RadarView = 'changes' | 'signals'
export type RadarFilter = 'all' | 'following' | 'unread'

export function useRadarMode() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawView = searchParams.get('view')
  // Feed-first (Signals) for daily browse; Changes via ?view=changes
  const view: RadarView =
    rawView === 'changes' ? 'changes' : 'signals'
  const rawFilter = searchParams.get('filter')
  const filter: RadarFilter =
    rawFilter === 'following' || rawFilter === 'unread' ? rawFilter : 'all'

  const setView = (next: RadarView) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'signals') p.delete('view')
        else p.set('view', 'changes')
        if (next === 'signals' && p.get('filter') === 'following') p.delete('filter')
        if (next === 'changes' && p.get('filter') === 'unread') p.delete('filter')
        return p
      },
      { replace: true },
    )
  }

  const setFilter = (next: RadarFilter) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'all') p.delete('filter')
        else p.set('filter', next)
        if (next === 'following') {
          p.set('view', 'changes')
        }
        if (next === 'unread') {
          p.delete('view')
        }
        return p
      },
      { replace: true },
    )
  }

  return { view, filter, setView, setFilter, searchParams, setSearchParams }
}

export function RadarModeBar({
  view,
  filter,
  onView,
  onFilter,
}: {
  view: RadarView
  filter: RadarFilter
  onView: (v: RadarView) => void
  onFilter: (f: RadarFilter) => void
}) {
  const { t } = useTranslation()
  const chip = (active: boolean) =>
    cn(
      'min-h-9 rounded-md px-2.5 py-1.5 text-xs transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
      active ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-border hover:text-ink',
    )

  return (
    <div
      className="sticky top-[env(safe-area-inset-top,0px)] z-10 mb-5 flex flex-col gap-3 bg-bg/95 py-2 backdrop-blur-sm motion-reduce:backdrop-blur-none supports-[backdrop-filter]:bg-bg/80 motion-reduce:supports-[backdrop-filter]:bg-bg sm:flex-row sm:items-center sm:justify-between"
      role="toolbar"
      aria-label={t('radar.title')}
    >
      <div className="flex flex-wrap gap-1" role="group" aria-label={t('radar.viewLabel')}>
        <button
          type="button"
          className={chip(view === 'signals')}
          aria-pressed={view === 'signals'}
          onClick={() => onView('signals')}
        >
          {t('radar.tabSignals')}
        </button>
        <button
          type="button"
          className={chip(view === 'changes')}
          aria-pressed={view === 'changes'}
          onClick={() => onView('changes')}
        >
          {t('radar.tabChanges')}
        </button>
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label={t('radar.filterLabel')}>
        <button
          type="button"
          className={chip(filter === 'all')}
          aria-pressed={filter === 'all'}
          onClick={() => onFilter('all')}
        >
          {t('radar.filterAll')}
        </button>
        <button
          type="button"
          className={chip(filter === 'following')}
          aria-pressed={filter === 'following'}
          onClick={() => onFilter('following')}
        >
          {t('radar.filterFollowing')}
        </button>
        <button
          type="button"
          className={chip(filter === 'unread')}
          aria-pressed={filter === 'unread'}
          onClick={() => onFilter('unread')}
        >
          {t('radar.filterUnread')}
        </button>
      </div>
    </div>
  )
}

export function RadarChangesPanel({
  followingOnly,
  searchQ,
  onClearSearch,
}: {
  followingOnly: boolean
  searchQ: string
  onClearSearch?: () => void
}) {
  const { t } = useTranslation()
  const { displaySourceIds } = useDisplaySources()
  const changes = useQuery({ queryKey: ['changes-list'], queryFn: () => api.changes(50) })
  const watching = useQuery({
    queryKey: ['watching'],
    queryFn: api.watchingTimeline,
    enabled: followingOnly,
  })

  const followedIds = useMemo(() => {
    const ids = new Set<number>()
    for (const g of watching.data?.groups ?? []) {
      if (g.eventId != null) ids.add(g.eventId)
    }
    return ids
  }, [watching.data])

  const q = searchQ.trim().toLowerCase()
  const rows = useMemo(() => {
    let list = (changes.data ?? []).filter((c) => changeMatchesDisplay(c, displaySourceIds))
    if (followingOnly) {
      list = list.filter((c) => followedIds.has(c.id) || followedIds.has(c.eventId))
    }
    if (q) {
      list = list.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.summary?.toLowerCase().includes(q) ||
          c.why?.toLowerCase().includes(q),
      )
    }
    return list
  }, [changes.data, displaySourceIds, followingOnly, followedIds, q])

  const loading = changes.isLoading || (followingOnly && watching.isLoading)
  const err = changes.error ?? (followingOnly ? watching.error : null)

  const emptyTitle = followingOnly
    ? t('radar.emptyFollowing')
    : q
      ? t('radar.emptySearch')
      : t('changes.empty')

  return (
    <div aria-busy={changes.isFetching || (followingOnly && watching.isFetching) || undefined}>
      {loading ? <ListSkeleton rows={6} /> : null}
      {err ? (
        <QueryErrorState
          message={t('common.loadFailed', { message: errorText(err, t) })}
          onRetry={() => {
            void changes.refetch()
            if (followingOnly) void watching.refetch()
          }}
        />
      ) : null}
      {rows.length ? (
        <ul className="space-y-3" aria-label={t('radar.changesList')}>
          {rows.map((c) => (
            <ChangeRow key={c.id} change={c} />
          ))}
        </ul>
      ) : null}
      {!loading && !err && !rows.length ? (
        <EmptyState
          title={emptyTitle}
          description={!followingOnly && !q ? t('changes.emptyHint') : undefined}
          primary={
            followingOnly ? (
              <Link
                to="/"
                className={cn(
                  'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
                  focusRingClass(),
                )}
              >
                {t('radar.goToday')}
              </Link>
            ) : q && onClearSearch ? (
              <button
                type="button"
                onClick={onClearSearch}
                className={cn(
                  'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
                  focusRingClass(),
                )}
              >
                {t('radar.clearSearch')}
              </button>
            ) : (
              <Link
                to="/settings/context"
                className={cn(
                  'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
                  focusRingClass(),
                )}
              >
                {t('changes.emptyCta')}
              </Link>
            )
          }
        />
      ) : null}
    </div>
  )
}

function ChangeRow({ change: c }: { change: ChangeCard }) {
  return (
    <li>
      <Link
        to={`/changes/${c.id}`}
        state={{ from: '/radar' }}
        aria-label={c.title}
        className={cn(
          'block rounded-xl border border-border bg-surface px-4 py-3 transition motion-reduce:transition-none hover:border-accent/40',
          focusRingClass(),
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink">{c.title}</span>
          {c.tier ? <StatusBadge status={c.tier} /> : null}
        </div>
        {c.why || c.summary ? (
          <p className="mt-1 text-sm text-muted line-clamp-2">{c.why || c.summary}</p>
        ) : null}
        {c.lastUpdatedAt ? (
          <p className="mt-2 font-mono text-[10px] text-faint">{c.lastUpdatedAt}</p>
        ) : null}
      </Link>
    </li>
  )
}

export function RadarSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const { t } = useTranslation()
  return (
    <div className="relative mb-4" role="search">
      <input
        id="radar-search-input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(inputClasses, 'rounded-lg', value ? 'pr-11' : undefined)}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('radar.clearSearch')}
          className={cn(
            'absolute right-1.5 top-1/2 inline-flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-border hover:text-ink',
            focusRingClass(),
          )}
        >
          <span aria-hidden>×</span>
        </button>
      ) : null}
    </div>
  )
}

/** Thin header used when RadarPage owns chrome; FeedPage signals keep their own header. */
export function RadarPageHeader() {
  const { t } = useTranslation()
  return <PageHeader title={t('radar.title')} subtitle={t('radar.subtitle')} />
}
