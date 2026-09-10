import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ChangeCard, type Item, type WatchingGroup } from '../lib/api'
import { Button, EmptyState, ListSkeleton, PageHeader, ScoreBar, useToast } from '../components/ui'
import { useMarkItemRead } from '../hooks/useMarkItemRead'
import { dateLocale } from '../i18n'

const TIMELINE_PREVIEW = 3

export default function WatchingPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const locale = dateLocale(i18n.language)
  const markItemRead = useMarkItemRead()
  const [showAllTimeline, setShowAllTimeline] = useState(false)

  const changes = useQuery({ queryKey: ['changes-watching'], queryFn: () => api.changes(40) })
  const saved = useQuery({ queryKey: ['watching-saved'], queryFn: () => api.items('?saved=true&sort=score&limit=50') })
  const timeline = useQuery({ queryKey: ['watching-timeline'], queryFn: api.watchingTimeline })

  const patchItem = useMutation({
    mutationFn: ({ id, saved, read }: { id: number; saved?: boolean; read?: boolean }) =>
      api.patchItem(id, { saved, read }),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ['watching-saved'] })
      await qc.invalidateQueries({ queryKey: ['watching'] })
      await qc.invalidateQueries({ queryKey: ['feed'] })
      if (vars.saved === false) {
        pushToast('success', t('watching.unsaved'), {
          label: t('common.undo'),
          onClick: () => {
            void api
              .patchItem(vars.id, { saved: true })
              .then(() => qc.invalidateQueries({ queryKey: ['watching-saved'] }))
              .catch(() => undefined)
          },
        })
      }
    },
    onError: (err) => {
      pushToast('error', t('common.loadFailed', { message: (err as Error).message }))
    },
  })

  const tracked = (changes.data ?? []).filter(
    (c) => c.tier === 'HIGH' || c.tier === 'MEDIUM' || c.status === 'WATCHING',
  )
  const savedItems = saved.data?.items ?? []
  const groups = timeline.data?.groups ?? []
  const visibleGroups = showAllTimeline ? groups : groups.slice(0, TIMELINE_PREVIEW)

  return (
    <div>
      <PageHeader
        title={t('watching.title')}
        subtitle={t('watching.subtitle')}
        actions={
          <Link to="/actions" className="text-sm text-moss underline underline-offset-2">
            {t('watching.openActions')}
          </Link>
        }
      />

      {groups.length > 0 ? (
        <section className="mb-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-ink">{t('watching.timeline')}</h2>
            {groups.length > TIMELINE_PREVIEW ? (
              <button
                type="button"
                onClick={() => setShowAllTimeline((v) => !v)}
                className="text-xs text-accent hover:underline"
              >
                {showAllTimeline ? t('watching.collapseTimeline') : t('watching.expandTimeline')}
              </button>
            ) : null}
          </div>
          <div className="space-y-3">
            {visibleGroups.map((g: WatchingGroup) => (
              <div key={g.eventId} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-baseline justify-between">
                  <Link
                    to={`/changes/${g.eventId}`}
                    state={{ from: '/watching' }}
                    className="font-medium text-ink hover:underline"
                  >
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
        {changes.isLoading ? <ListSkeleton rows={3} /> : null}
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
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-ink">{t('watching.savedItems')}</h2>
          <span className="font-mono text-xs text-muted">
            {t('watching.savedCount', { count: savedItems.length })}
          </span>
        </div>
        {saved.isLoading ? <ListSkeleton rows={3} /> : null}
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
                      onClick={() => {
                        if (!item.read) markItemRead.mutate({ id: item.id, read: true })
                      }}
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
                      {item.read ? <span className="font-mono">{t('watching.readBadge')}</span> : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {!item.read ? (
                        <button
                          type="button"
                          onClick={() => patchItem.mutate({ id: item.id, read: true })}
                          className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-mist hover:text-ink"
                        >
                          {t('common.markRead')}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={patchItem.isPending}
                        onClick={() => patchItem.mutate({ id: item.id, saved: false })}
                        className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-mist hover:text-ink disabled:opacity-50"
                      >
                        {t('watching.unsave')}
                      </button>
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
