import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ImpactCard } from '../lib/api'
import {
  Button,
  HeroFocusCard,
  ImmersiveDrawer,
  ListSkeleton,
  MagAction,
  MagCard,
  MagGrid,
  PageHeader,
  StateBox,
  useToast,
} from '../components/ui'
import { PackPicker } from '../components/PackPicker'
import { FetchProgressSection } from '../components/fetch/FetchProgressSection'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { useSources } from '../hooks/useSources'
import { errorText } from '../lib/errors'

function impactScore(card: ImpactCard): number {
  return card.priority
    ? Math.min(100, Math.round(card.priority / 1000))
    : Math.round(card.relevance ?? 0)
}

export default function TodayPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const home = useQuery({ queryKey: ['intelligence-home'], queryFn: api.intelligenceHome })
  const sources = useSources()
  const [drawerId, setDrawerId] = useState<number | null>(null)

  const { fetchJob, retryFailed, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['intelligence-home'],
    ['changes-watching'],
    ['feed'],
    ['watching'],
    ['sources'],
  ])

  const impactJob = useMutation({
    mutationFn: api.impactJob,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['intelligence-home'] }),
        qc.invalidateQueries({ queryKey: ['actions'] }),
        qc.invalidateQueries({ queryKey: ['changes-watching'] }),
        qc.invalidateQueries({ queryKey: ['watching'] }),
      ])
      pushToast('success', t('today.impactDone'))
    },
    onError: (err) => pushToast('error', errorText(err, t)),
  })

  const data = home.data
  const sourceCount = sources.data?.length ?? 0
  const hasSources = sourceCount > 0
  const todayChanges = (data?.todayChanges ?? data?.whyCare ?? []).slice(0, 10)
  const ready = todayChanges.length > 0

  const { hero, rest } = useMemo(() => {
    if (todayChanges.length === 0) return { hero: null as ImpactCard | null, rest: [] as ImpactCard[] }
    const highIdx = todayChanges.findIndex((c) => (c.tier ?? '').toUpperCase() === 'HIGH')
    const idx = highIdx >= 0 ? highIdx : 0
    const heroCard = todayChanges[idx]
    const restCards = todayChanges.filter((_, i) => i !== idx)
    return { hero: heroCard, rest: restCards }
  }, [todayChanges])

  const highCount = todayChanges.filter((c) => c.tier === 'HIGH').length
  const drawerCard = todayChanges.find((c) => c.id === drawerId) ?? null

  const runFetch = () => {
    fetchJob.mutate(undefined, {
      onSuccess: () => impactJob.mutate(),
    })
  }

  return (
    <div>
      <PageHeader
        title={t('today.title')}
        subtitle={t('today.subtitle')}
        actions={
          <Button onClick={runFetch} loading={isPending}>
            {phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
          </Button>
        }
      />

      <FetchProgressSection
        phase={phase}
        progress={progress}
        onDismiss={() => void dismiss()}
        retrying={retryFailed.isPending}
        onRetryFailed={(types) => retryFailed.mutate(types)}
      />

      {home.isLoading ? <ListSkeleton rows={4} /> : null}
      {home.isError ? (
        <StateBox>{t('common.loadFailed', { message: errorText(home.error, t) })}</StateBox>
      ) : null}

      {!home.isLoading && !home.isError && !ready ? (
        <div className="mb-8 rounded-xl border border-dashed border-border bg-surface p-6">
          <h3 className="text-lg font-medium text-ink">
            {hasSources ? t('home.gettingStarted.hasSourcesTitle') : t('home.gettingStarted.title')}
          </h3>
          <p className="mt-2 max-w-xl text-sm text-muted">
            {hasSources ? t('home.gettingStarted.hasSourcesSubtitle') : t('home.gettingStarted.subtitle')}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {!hasSources ? (
              <PackPicker
                buttonLabel={t('home.gettingStarted.import')}
                successMessage="home.gettingStarted.imported"
              />
            ) : null}
            <Button onClick={runFetch} loading={isPending}>
              {hasSources ? t('common.fetchNow') : t('home.gettingStarted.step2')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => impactJob.mutate()}
              loading={impactJob.isPending}
              disabled={!hasSources}
            >
              {impactJob.isPending ? t('today.impactRunning') : t('today.recomputeImpact')}
            </Button>
            <Link
              to="/settings/context"
              className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm text-accent hover:border-accent/50"
            >
              {t('home.gettingStarted.stepContext')}
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted">{t('home.gettingStarted.updateHint')}</p>
        </div>
      ) : null}

      {ready && hero ? (
        <>
          <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
            <span className="text-muted">
              {t('today.statShown')}{' '}
              <strong className="font-mono text-ink">{todayChanges.length}</strong>
            </span>
            <span className="text-muted">
              {t('today.statHigh')}{' '}
              <strong className="font-mono text-ink">{highCount}</strong>
            </span>
            <Link to="/feed" className="ml-auto text-accent hover:underline">
              {t('today.goFeed')} →
            </Link>
          </div>

          <HeroFocusCard
            title={hero.title}
            why={hero.why}
            evidence={hero.evidence}
            score={impactScore(hero)}
            tier={hero.tier}
            onOpen={() => setDrawerId(hero.id)}
            actions={
              <Link
                to={`/changes/${hero.eventId}`}
                state={{ from: '/' }}
                className="inline-flex items-center rounded-md px-2 py-1 text-xs text-muted transition hover:bg-border hover:text-ink"
              >
                {t('today.openChange')} →
              </Link>
            }
          />

          {rest.length > 0 ? (
            <MagGrid dimmed={drawerId != null}>
              {rest.map((card) => (
                <MagCard
                  key={card.id}
                  dataId={card.id}
                  title={card.title}
                  lead={card.why}
                  score={impactScore(card)}
                  tier={card.tier}
                  coverLabel={card.tier === 'HIGH' ? 'HIGH' : card.tier === 'MEDIUM' || card.tier === 'MED' ? 'MED' : 'NOW'}
                  selected={card.id === drawerId}
                  dimmed={drawerId != null && card.id !== drawerId}
                  onOpen={() => setDrawerId(card.id)}
                  meta={
                    <>
                      {card.tier ? <span className="font-mono">{card.tier}</span> : null}
                      {card.evidence ? (
                        <span className="line-clamp-1 max-w-[18rem]">{card.evidence}</span>
                      ) : null}
                    </>
                  }
                  actions={
                    <MagAction onClick={() => setDrawerId(card.id)}>{t('today.heroOpen')}</MagAction>
                  }
                />
              ))}
            </MagGrid>
          ) : null}

          <p className="mt-4 text-xs text-muted">
            {t('today.hint')}{' '}
            <Link to="/settings" className="text-accent hover:underline">
              {t('today.configureContext')}
            </Link>
            {' · '}
            <Link to="/actions" className="text-accent hover:underline">
              {t('nav.actions')}
            </Link>
          </p>

          <ImmersiveDrawer
            open={!!drawerCard}
            onClose={() => setDrawerId(null)}
            title={drawerCard?.title}
            subtitle={
              drawerCard ? (
                <div className="flex flex-wrap items-center gap-2">
                  {drawerCard.tier ? (
                    <span className="font-mono">{drawerCard.tier}</span>
                  ) : null}
                  <span className="font-mono tabular-nums">{impactScore(drawerCard)}</span>
                </div>
              ) : null
            }
            footer={
              drawerCard ? (
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/changes/${drawerCard.eventId}`}
                    state={{ from: '/' }}
                    className="inline-flex items-center rounded-md px-2 py-1 text-xs text-moss transition hover:bg-moss/10"
                  >
                    {t('today.openChange')} →
                  </Link>
                </div>
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
                    <p className="mt-1 text-sm leading-relaxed text-ink">
                      {drawerCard.recommendation}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </ImmersiveDrawer>
        </>
      ) : null}
    </div>
  )
}
