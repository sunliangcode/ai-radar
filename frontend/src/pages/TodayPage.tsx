import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { api, type ImpactCard } from '../lib/api'
import {
  Button,
  ImmersiveDrawer,
  ListSkeleton,
  PageHeader,
  StateBox,
  useToast,
} from '../components/ui'
import { ChangeCard } from '../components/change/ChangeCard'
import { DecisionForm, type DecisionKind } from '../components/change/DecisionForm'
import { PackPicker } from '../components/PackPicker'
import { FetchProgressSection } from '../components/fetch/FetchProgressSection'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { useSources } from '../hooks/useSources'
import { errorText } from '../lib/errors'

export default function TodayPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const home = useQuery({ queryKey: ['intelligence-home'], queryFn: api.intelligenceHome })
  const sources = useSources()
  const [decideCard, setDecideCard] = useState<ImpactCard | null>(null)
  const [decideKind, setDecideKind] = useState<DecisionKind>('watch')

  const { fetchJob, retryFailed, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['intelligence-home'],
    ['changes-watching'],
    ['feed'],
    ['watching'],
    ['sources'],
    ['decisions'],
  ])

  const impactJob = useMutation({
    mutationFn: api.impactJob,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      pushToast('success', t('today.impactDone'))
    },
    onError: (err) => pushToast('error', errorText(err, t)),
  })

  const dismissMut = useMutation({
    mutationFn: (changeId: number) => api.dismissChange(changeId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      pushToast('success', t('today.dismissed'))
    },
    onError: (err) => pushToast('error', errorText(err, t)),
  })

  const watchMut = useMutation({
    mutationFn: (changeId: number) => api.putWatch(changeId, { capability: true, api: true }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      await qc.invalidateQueries({ queryKey: ['watching'] })
      pushToast('success', t('today.watched'))
    },
    onError: (err) => pushToast('error', errorText(err, t)),
  })

  const decisionMut = useMutation({
    mutationFn: ({
      changeId,
      kind,
      reason,
      revisitAt,
    }: {
      changeId: number
      kind: DecisionKind
      reason: string
      revisitAt: string
    }) =>
      api.postChangeDecision(changeId, {
        kind,
        reason: reason || undefined,
        revisitAt: revisitAt ? `${revisitAt}T00:00:00Z` : undefined,
      }),
    onSuccess: async () => {
      setDecideCard(null)
      await qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      await qc.invalidateQueries({ queryKey: ['decisions'] })
      pushToast('success', t('decisions.saved'))
    },
    onError: (err) => pushToast('error', errorText(err, t)),
  })

  const data = home.data
  const sourceCount = sources.data?.length ?? 0
  const hasSources = sourceCount > 0
  const major = (data?.majorChanges ?? data?.todayChanges ?? []).slice(0, 3)
  const minor = (data?.minorSignals ?? []).slice(0, 5)
  const revisit = (data?.decisionsToRevisit ?? []).slice(0, 1)
  const alerts = data?.proactiveAlerts ?? []
  const majorCount = data?.stats?.majorCount ?? major.length
  const ready = major.length > 0 || minor.length > 0

  const openDecide = (card: ImpactCard, kind: DecisionKind = 'watch') => {
    setDecideKind(kind)
    setDecideCard(card)
  }

  const runFetch = () => {
    fetchJob.mutate(undefined, {
      onSuccess: () => impactJob.mutate(),
    })
  }

  const busy = dismissMut.isPending || watchMut.isPending || decisionMut.isPending

  return (
    <div>
      <PageHeader
        title={t('today.radarTitle', { count: majorCount })}
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
              <PackPicker buttonLabel={t('home.gettingStarted.import')} successMessage="home.gettingStarted.imported" />
            ) : null}
            <Button onClick={runFetch} loading={isPending}>
              {hasSources ? t('common.fetchNow') : t('home.gettingStarted.step2')}
            </Button>
            <Link
              to="/settings/context"
              className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm text-accent hover:border-accent/50"
            >
              {t('home.gettingStarted.stepContext')}
            </Link>
          </div>
        </div>
      ) : null}

      {alerts.length > 0 ? (
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
          <p className="font-medium text-accent">{t('today.proactiveTitle')}</p>
          <p className="mt-1 text-ink">{alerts[0]?.title ?? alerts[0]?.label}</p>
          {alerts[0]?.changeId ? (
            <Link to={`/changes/${alerts[0].changeId}`} className="mt-2 inline-block text-xs text-accent hover:underline">
              {t('today.reviewChange')}
            </Link>
          ) : null}
        </div>
      ) : null}

      {revisit.length > 0 ? (
        <div className="mb-6 rounded-lg border border-moss/30 bg-moss/5 px-4 py-3">
          <p className="text-sm font-medium text-moss">{t('today.revisitTitle')}</p>
          <p className="mt-1 text-sm text-ink">
            {t('today.revisitBody', {
              title: revisit[0].changeTitle ?? '',
              updates: revisit[0].updatesSinceDecision ?? 0,
            })}
          </p>
          <Link to="/decisions" className="mt-2 inline-block text-xs text-moss hover:underline">
            {t('today.openDecisions')}
          </Link>
        </div>
      ) : null}

      {ready ? (
        <>
          <section className="mb-8 space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted">{t('today.majorChanges')}</h2>
            {major.map((card) => {
              const cid = card.eventId
              if (!cid) return null
              return (
                <ChangeCard
                  key={card.id ?? cid}
                  card={card}
                  busy={busy}
                  onDismiss={() => dismissMut.mutate(cid)}
                  onWatch={() => watchMut.mutate(cid)}
                  onDecide={() => openDecide(card, 'watch')}
                  onInvestigate={() => openDecide(card, 'investigate')}
                />
              )
            })}
          </section>

          {minor.length > 0 ? (
            <details className="mb-6 rounded-lg border border-border bg-surface/50 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-muted">{t('today.minorSignals')}</summary>
              <ul className="mt-3 space-y-2">
                {minor.map((card) => (
                  <li key={card.id} className="text-sm">
                    <Link to={`/changes/${card.eventId}`} className="text-accent hover:underline">
                      {card.title}
                    </Link>
                    {card.why ? <p className="text-xs text-muted line-clamp-2">{card.why}</p> : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <p className="text-xs text-muted">
            <Link to="/explore" className="text-accent hover:underline">
              {t('today.exploreLink')}
            </Link>
            {' · '}
            <Link to="/settings/context" className="text-accent hover:underline">
              {t('today.configureContext')}
            </Link>
          </p>
        </>
      ) : null}

      <ImmersiveDrawer
        open={!!decideCard}
        onClose={() => setDecideCard(null)}
        title={t('decisions.record')}
        subtitle={decideCard?.title}
      >
        {decideCard?.eventId ? (
          <DecisionForm
            defaultKind={decideKind}
            loading={decisionMut.isPending}
            onCancel={() => setDecideCard(null)}
            onSubmit={(kind, reason, revisitAt) =>
              decisionMut.mutate({ changeId: decideCard.eventId!, kind, reason, revisitAt })
            }
          />
        ) : null}
      </ImmersiveDrawer>
    </div>
  )
}
