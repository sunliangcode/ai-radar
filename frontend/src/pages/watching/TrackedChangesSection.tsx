import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ChangeCard } from '../../lib/api'
import {
  Button,
  EmptyState,
  ImmersiveDrawer,
  ListSkeleton,
  MagAction,
  MagCard,
  MagGrid,
  StateBox,
} from '../../components/ui'
import { errorText } from '../../lib/errors'

function changeScore(c: ChangeCard): number | undefined {
  if (c.priority != null) return Math.min(100, Math.round(c.priority / 1000))
  return c.score
}

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
  const [drawerId, setDrawerId] = useState<number | null>(null)
  const drawerCard = tracked.find((c) => c.id === drawerId) ?? null

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
        <MagGrid dimmed={drawerId != null}>
          {tracked.map((c) => (
            <MagCard
              key={c.id}
              dataId={c.id}
              title={c.title}
              lead={c.why}
              score={changeScore(c)}
              tier={c.tier}
              selected={c.id === drawerId}
              dimmed={drawerId != null && c.id !== drawerId}
              onOpen={() => setDrawerId(c.id)}
              meta={
                <>
                  {c.tier ? <span className="font-mono">{c.tier}</span> : null}
                  <span className="font-mono">
                    {t('common.itemsCount', { count: c.itemCount ?? 0 })}
                  </span>
                  {c.lastUpdatedAt ? (
                    <span className="tabular-nums">
                      {new Date(c.lastUpdatedAt).toLocaleString(locale)}
                    </span>
                  ) : null}
                </>
              }
              actions={
                <>
                  <MagAction onClick={() => setDrawerId(c.id)}>{t('today.heroOpen')}</MagAction>
                  <Link
                    to={`/changes/${c.id}`}
                    state={{ from: '/watching' }}
                    className="inline-flex items-center rounded-md px-2 py-1 text-xs text-muted transition hover:bg-border hover:text-ink"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t('today.openChange')} →
                  </Link>
                </>
              }
            />
          ))}
        </MagGrid>
      ) : null}

      <ImmersiveDrawer
        open={!!drawerCard}
        onClose={() => setDrawerId(null)}
        title={drawerCard?.title}
        subtitle={
          drawerCard ? (
            <div className="flex flex-wrap items-center gap-2">
              {drawerCard.tier ? <span className="font-mono">{drawerCard.tier}</span> : null}
              <span className="font-mono">
                {t('common.itemsCount', { count: drawerCard.itemCount ?? 0 })}
              </span>
            </div>
          ) : null
        }
        footer={
          drawerCard ? (
            <Link
              to={`/changes/${drawerCard.id}`}
              state={{ from: '/watching' }}
              className="inline-flex items-center rounded-md px-2 py-1 text-xs text-moss transition hover:bg-moss/10"
            >
              {t('today.openChange')} →
            </Link>
          ) : null
        }
      >
        {drawerCard ? (
          <div className="space-y-4">
            {drawerCard.why ? (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-accent">
                  {t('today.whyLabel')}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink">{drawerCard.why}</p>
              </div>
            ) : null}
            {drawerCard.evidence ? (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  {t('today.evidenceLabel')}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{drawerCard.evidence}</p>
              </div>
            ) : null}
            {drawerCard.recommendation ? (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  {t('today.recommendationLabel')}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink">{drawerCard.recommendation}</p>
              </div>
            ) : null}
            {drawerCard.summary && !drawerCard.why ? (
              <p className="text-sm leading-relaxed text-ink">{drawerCard.summary}</p>
            ) : null}
          </div>
        ) : null}
      </ImmersiveDrawer>
    </section>
  )
}
