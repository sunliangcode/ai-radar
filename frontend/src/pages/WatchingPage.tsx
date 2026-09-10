import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ChangeCard, type Item, type WatchingGroup } from '../lib/api'
import { Button, EmptyState, PageHeader, ScoreBar, StateBox } from '../components/ui'
import { dateLocale } from '../i18n'

export default function WatchingPage() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)

  const changes = useQuery({ queryKey: ['changes-watching'], queryFn: () => api.changes(40) })
  const saved = useQuery({ queryKey: ['watching-saved'], queryFn: () => api.items('?saved=true&sort=score&limit=50') })
  const timeline = useQuery({ queryKey: ['watching-timeline'], queryFn: api.watchingTimeline })

  const tracked = (changes.data ?? []).filter(
    (c) => c.tier === 'HIGH' || c.tier === 'MEDIUM' || c.status === 'WATCHING',
  )
  const savedItems = saved.data?.items ?? []
  const groups = timeline.data?.groups ?? []

  return (
    <div>
      <PageHeader title={t('watching.title')} subtitle={t('watching.subtitle')} />

      {groups.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-ink">{t('watching.timeline')}</h2>
          <div className="space-y-3">
            {groups.map((g: WatchingGroup) => (
              <div key={g.eventId} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-baseline justify-between">
                  <Link to={`/changes/${g.eventId}`} className="font-medium text-ink hover:underline">
                    {g.title}
                  </Link>
                  <span className="font-mono text-[11px] text-muted">{g.entryCount}</span>
                </div>
                <ol className="mt-2 space-y-1.5 border-l-2 border-mist pl-3">
                  {g.entries.map((e) => (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[0.42rem] top-1.5 h-1.5 w-1.5 rounded-full bg-muted" />
                      <p className="font-mono text-[10px] text-muted">{e.at ? new Date(e.at).toLocaleString(locale) : ''}</p>
                      <p className="text-sm text-ink">{e.label}</p>
                      {e.note ? <p className="text-xs text-muted">{e.note}</p> : null}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold text-ink">{t('watching.trackedChanges')}</h2>
        {changes.isLoading ? <StateBox>{t('common.loading')}</StateBox> : null}
        {!changes.isLoading && tracked.length === 0 ? (
          <EmptyState title={t('watching.noTracked')} description={t('watching.noTrackedHint')} />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {tracked.map((c: ChangeCard) => (
              <li key={c.id} className="row-py px-4">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    <ScoreBar score={c.priority ? Math.min(100, Math.round(c.priority / 1000)) : c.score} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={`/changes/${c.id}`} className="font-medium text-ink hover:underline">
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
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-ink">{t('watching.savedItems')}</h2>
          <span className="font-mono text-xs text-muted">
            {t('watching.savedCount', { count: savedItems.length })}
          </span>
        </div>
        {saved.isLoading ? <StateBox>{t('common.loading')}</StateBox> : null}
        {!saved.isLoading && savedItems.length === 0 ? (
          <EmptyState
            title={t('watching.noSaved')}
            description={t('watching.noSavedHint')}
            primary={
              <Link to="/feed">
                <Button>{t('watching.goFeed')}</Button>
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {savedItems.map((item: Item) => (
              <li key={item.id} className="row-py px-4">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5 w-12 shrink-0">
                    <ScoreBar score={item.score} source={item.scoreSource} reason={item.scoreReason} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <a
                      href={item.canonicalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-ink hover:underline"
                    >
                      {item.title}
                    </a>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      {item.primarySourceType ? <span className="font-mono">{item.primarySourceType}</span> : null}
                      {item.publishedAt ? (
                        <span className="font-mono tabular-nums">
                          {new Date(item.publishedAt).toLocaleDateString(locale)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
