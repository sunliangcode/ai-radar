import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ChangeCard } from '../../lib/api'
import { Button, EmptyState, ListSkeleton, ScoreBar, StateBox } from '../../components/ui'
import { errorText } from '../../lib/errors'

export function TrackedChangesSection({
  tracked,
  loading,
  error,
  locale,
  onRetry,
}: {
  tracked: ChangeCard[]
  loading: boolean
  error: unknown
  locale: string
  onRetry: () => void
}) {
  const { t } = useTranslation()

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-base font-semibold text-ink">{t('watching.trackedChanges')}</h2>
      {loading ? <ListSkeleton rows={3} /> : null}
      {error ? (
        <StateBox>
          <p className="mb-3">{t('common.loadFailed', { message: errorText(error, t) })}</p>
          <Button variant="ghost" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </StateBox>
      ) : null}
      {!loading && !error && tracked.length === 0 ? (
        <EmptyState title={t('watching.noTracked')} description={t('watching.noTrackedHint')} />
      ) : null}
      {!error && tracked.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {tracked.map((c) => (
            <li key={c.id} className="row-py px-4">
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  <ScoreBar
                    score={c.priority ? Math.min(100, Math.round(c.priority / 1000)) : c.score}
                    size="sm"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/changes/${c.id}`}
                    state={{ from: '/watching' }}
                    className="font-medium text-ink hover:underline"
                  >
                    {c.title}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    {c.tier ? <span className="font-mono">{c.tier}</span> : null}
                    <span className="font-mono">
                      {t('common.itemsCount', { count: c.itemCount ?? 0 })}
                    </span>
                    {c.lastUpdatedAt ? (
                      <span className="font-mono tabular-nums">
                        {new Date(c.lastUpdatedAt).toLocaleString(locale)}
                      </span>
                    ) : null}
                  </div>
                  {c.why ? <p className="mt-1 text-sm text-muted">{c.why}</p> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
