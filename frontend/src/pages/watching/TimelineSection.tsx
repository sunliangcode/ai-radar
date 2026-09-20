import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { WatchingGroup } from '../../lib/api'
import { ListSkeleton, QueryErrorState } from '../../components/ui'
import { errorText } from '../../lib/errors'
import { cn, focusRingClass, textLinkClass } from '../../lib/cn'

const TIMELINE_PREVIEW = 3

export { TIMELINE_PREVIEW }

export function TimelineSection({
  groups,
  visibleGroups,
  showAll,
  locale,
  loading,
  error,
  onRetry,
  onToggleShowAll,
}: {
  groups: WatchingGroup[]
  visibleGroups: WatchingGroup[]
  showAll: boolean
  locale: string
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  onToggleShowAll: () => void
}) {
  const { t } = useTranslation()
  if (!loading && !error && groups.length === 0) return null

  return (
    <section className="mb-8" aria-labelledby="watching-timeline-heading" aria-busy={loading || undefined}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="watching-timeline-heading" className="text-base font-semibold text-ink">
          {t('watching.timeline')}
        </h2>
        {!loading && !error && groups.length > TIMELINE_PREVIEW ? (
          <button
            type="button"
            onClick={onToggleShowAll}
            className={cn('inline-flex min-h-9 items-center text-xs', textLinkClass())}
            aria-expanded={showAll}
            aria-controls="watching-timeline-list"
          >
            {showAll ? t('watching.collapseTimeline') : t('watching.expandTimeline')}
          </button>
        ) : null}
      </div>
      {loading ? <ListSkeleton rows={2} /> : null}
      {error ? (
        <QueryErrorState
          message={t('common.loadFailed', { message: errorText(error, t) })}
          onRetry={onRetry}
        />
      ) : null}
      {!loading && !error && groups.length > 0 ? (
        <div id="watching-timeline-list" className="space-y-3">
          {visibleGroups.map((g) => (
            <article key={g.eventId} className="rounded-xl border border-border bg-surface px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  to={`/changes/${g.eventId}`}
                  state={{ from: '/watching' }}
                  className={cn(
                    'inline-flex min-h-9 items-center rounded-sm font-semibold text-ink hover:text-accent',
                    focusRingClass(),
                  )}
                >
                  {g.title}
                </Link>
                <span
                  className="shrink-0 font-mono text-[11px] text-muted"
                  aria-label={t('watching.entryCount', { count: g.entryCount })}
                >
                  {g.entryCount}
                </span>
              </div>
              <ol className="mt-3 space-y-2 border-l-2 border-border pl-3">
                {g.entries.map((e) => (
                  <li key={e.id} className="relative">
                    <span
                      className="absolute -left-[0.42rem] top-1.5 h-1.5 w-1.5 rounded-full bg-accent"
                      aria-hidden
                    />
                    <p className="font-mono text-[10px] text-muted">
                      {e.at ? new Date(e.at).toLocaleString(locale) : ''}
                    </p>
                    <p className="text-sm text-ink">{e.label}</p>
                    {e.note ? <p className="text-xs text-muted">{e.note}</p> : null}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
