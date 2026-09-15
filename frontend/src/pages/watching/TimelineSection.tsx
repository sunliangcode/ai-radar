import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { WatchingGroup } from '../../lib/api'

const TIMELINE_PREVIEW = 3

export { TIMELINE_PREVIEW }

export function TimelineSection({
  groups,
  visibleGroups,
  showAll,
  locale,
  onToggleShowAll,
}: {
  groups: WatchingGroup[]
  visibleGroups: WatchingGroup[]
  showAll: boolean
  locale: string
  onToggleShowAll: () => void
}) {
  const { t } = useTranslation()
  if (groups.length === 0) return null

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink">{t('watching.timeline')}</h2>
        {groups.length > TIMELINE_PREVIEW ? (
          <button
            type="button"
            onClick={onToggleShowAll}
            className="text-xs text-accent hover:underline"
          >
            {showAll ? t('watching.collapseTimeline') : t('watching.expandTimeline')}
          </button>
        ) : null}
      </div>
      <div className="space-y-3">
        {visibleGroups.map((g) => (
          <div key={g.eventId} className="rounded-xl border border-border bg-surface px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <Link
                to={`/changes/${g.eventId}`}
                state={{ from: '/watching' }}
                className="font-semibold text-ink hover:text-accent"
              >
                {g.title}
              </Link>
              <span className="shrink-0 font-mono text-[11px] text-muted">{g.entryCount}</span>
            </div>
            <ol className="mt-3 space-y-2 border-l-2 border-border pl-3">
              {g.entries.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[0.42rem] top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
                  <p className="font-mono text-[10px] text-muted">
                    {e.at ? new Date(e.at).toLocaleString(locale) : ''}
                  </p>
                  <p className="text-sm text-ink">{e.label}</p>
                  {e.note ? <p className="text-xs text-muted">{e.note}</p> : null}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  )
}
