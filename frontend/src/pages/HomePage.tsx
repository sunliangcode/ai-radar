import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { api, type ActionCard, type ImpactCard } from '../lib/api'
import { FeedbackBar } from '../components/FeedbackBar'
import { Button, PageHeader, ScorePill, StateBox, StatusBadge } from '../components/ui'
import { FetchProgressPanel } from '../components/FetchProgressPanel'
import { FetchResultSummary } from '../components/FetchResultSummary'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'

function hasIntel(data: {
  todayChanges?: unknown[]
  actions?: unknown[]
  whatChanged?: unknown[]
  impacts?: unknown[]
} | undefined) {
  if (!data) return false
  return (
    (data.todayChanges?.length ?? 0) > 0 ||
    (data.actions?.length ?? 0) > 0 ||
    (data.whatChanged?.length ?? 0) > 0 ||
    (data.impacts?.length ?? 0) > 0
  )
}

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const home = useQuery({ queryKey: ['intelligence-home'], queryFn: api.intelligenceHome })
  const briefs = useQuery({ queryKey: ['briefs'], queryFn: api.briefs })
  const sources = useQuery({ queryKey: ['sources'], queryFn: api.sources })
  const [jobToast, setJobToast] = useState<string | null>(null)
  const defaultPack = i18n.language.startsWith('zh') ? 'ai-cn' : 'ai-core'
  const [packId, setPackId] = useState(defaultPack)

  const { fetchJob, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['intelligence-home'],
    ['changes'],
    ['items'],
    ['briefs'],
    ['sources'],
  ])
  const impactJob = useMutation({
    mutationFn: api.impactJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      qc.invalidateQueries({ queryKey: ['changes'] })
      setJobToast(t('home.impactDone'))
      setTimeout(() => setJobToast(null), 2500)
    },
    onError: (e) => {
      setJobToast((e as Error).message)
      setTimeout(() => setJobToast(null), 4000)
    },
  })
  const importPack = useMutation({
    mutationFn: () => api.importPack({ packId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      qc.invalidateQueries({ queryKey: ['settings'] })
      setJobToast(t('home.gettingStarted.imported'))
      setTimeout(() => setJobToast(null), 2500)
    },
    onError: (e) => {
      setJobToast((e as Error).message)
      setTimeout(() => setJobToast(null), 4000)
    },
  })

  const latestBrief = briefs.data?.[0]?.date
  const data = home.data
  const sourceCount = sources.data?.length ?? 0
  const ready = hasIntel(data)
  const showGettingStarted = !home.isLoading && !home.isError && !ready
  const todayChanges = (data?.todayChanges ?? data?.whyCare ?? []).slice(0, 5)
  const previewActions = (data?.actions ?? []).slice(0, 3)

  const updateLabel = phase === 'running' ? t('common.fetching') : t('common.fetchNow')
  const updateButton = (
    <Button loading={isPending} onClick={() => fetchJob.mutate()}>
      {updateLabel}
    </Button>
  )

  return (
    <div>
      <PageHeader
        title={t('home.title')}
        subtitle={t('home.subtitle')}
        actions={
          <>
            {updateButton}
            {!showGettingStarted ? (
              <Button variant="ghost" loading={impactJob.isPending} onClick={() => impactJob.mutate()}>
                {t('home.recomputeImpact')}
              </Button>
            ) : null}
          </>
        }
      />

      {phase === 'running' ? <FetchProgressPanel progress={progress} /> : null}
      {phase === 'summary' ? <FetchResultSummary progress={progress} onDismiss={() => void dismiss()} /> : null}
      {jobToast ? (
        <p className="mb-4 text-sm text-moss" role="status">
          {jobToast}
        </p>
      ) : null}

      {home.isLoading || sources.isLoading ? <StateBox>{t('home.loading')}</StateBox> : null}
      {home.isError ? (
        <StateBox>{t('common.loadFailed', { message: (home.error as Error).message })}</StateBox>
      ) : null}

      {showGettingStarted ? (
        <section className="mb-8 rounded-xl border border-mist bg-paper/80 p-6 md:p-8">
          <h3 className="font-serif text-2xl text-ink">
            {sourceCount > 0
              ? t('home.gettingStarted.hasSourcesTitle')
              : t('home.gettingStarted.title')}
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {sourceCount > 0
              ? t('home.gettingStarted.hasSourcesSubtitle')
              : t('home.gettingStarted.subtitle')}
          </p>
          <p className="mt-4 text-sm text-muted">
            <Link className="text-moss underline underline-offset-2" to="/contexts">
              {t('home.setupContext')}
            </Link>
          </p>

          {sourceCount === 0 ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-ink">{t('home.gettingStarted.step1')}</p>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  className="rounded-md border border-mist bg-paper px-3 py-2 text-sm"
                  value={packId}
                  onChange={(e) => setPackId(e.target.value)}
                  aria-label={t('home.gettingStarted.import')}
                >
                  <option value="ai-core">{t('home.pack.ai-core')}</option>
                  <option value="ai-cn">{t('home.pack.ai-cn')}</option>
                  <option value="ai-signals">{t('home.pack.ai-signals')}</option>
                </select>
                <Button loading={importPack.isPending} onClick={() => importPack.mutate()}>
                  {importPack.isPending
                    ? t('home.gettingStarted.importing')
                    : t('home.gettingStarted.import')}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-8 space-y-2">
            <p className="text-sm font-medium text-ink">{t('home.gettingStarted.step2')}</p>
            <div className="pt-1">{updateButton}</div>
          </div>
        </section>
      ) : null}

      {ready && data ? (
        <>
          <section className="mb-8">
            <h2 className="mb-4 font-serif text-xl text-ink">{t('home.todayChanges')}</h2>
            {todayChanges.length === 0 ? (
              <StateBox>{t('home.todayChangesEmpty')}</StateBox>
            ) : (
              <div className="space-y-4">
                {todayChanges.map((card) => (
                  <TodayChangeCard key={card.id} card={card} />
                ))}
              </div>
            )}
          </section>

          <section className="mb-8">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-xl text-ink">{t('home.suggestedActions')}</h2>
              <Link to="/actions" className="text-sm text-moss underline underline-offset-2">
                {t('home.viewAllActions')}
              </Link>
            </div>
            {previewActions.length === 0 ? (
              <p className="text-sm text-muted">{t('home.whatShouldIDoEmpty')}</p>
            ) : (
              <ul className="space-y-3">
                {previewActions.map((action) => (
                  <ActionPreview key={action.id} action={action} />
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap gap-4 text-sm text-muted">
            {latestBrief ? (
              <Link className="text-moss underline underline-offset-2" to={`/briefs/${latestBrief}`}>
                {t('home.latestBrief', { date: latestBrief })}
              </Link>
            ) : (
              <span>{t('home.noBrief')}</span>
            )}
            <Link className="text-moss underline underline-offset-2" to="/changes">
              {t('home.allChanges')}
            </Link>
          </div>
        </>
      ) : null}
    </div>
  )
}

function TodayChangeCard({ card }: { card: ImpactCard }) {
  const { t } = useTranslation()
  return (
    <article className="rounded-xl border border-mist bg-paper/70 p-4">
      <div className="flex gap-3">
        <ScorePill score={card.priority ? Math.min(100, Math.round(card.priority / 1000)) : card.relevance} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/changes/${card.eventId}`} className="font-medium text-ink hover:text-moss">
              {card.title}
            </Link>
            {card.tier ? <StatusBadge status={card.tier} /> : null}
          </div>
          <p className="mt-2 text-xs text-muted">
            R{Math.round(card.relevance ?? 0)} · I{Math.round(card.impact ?? 0)} · U
            {Math.round(card.urgency ?? 0)} · C{Math.round(card.confidence ?? 0)}
          </p>
          {card.why ? (
            <p className="mt-2 text-sm text-ink">
              <span className="text-muted">{t('home.whyMatters')}: </span>
              {card.why}
            </p>
          ) : null}
          {card.evidence ? (
            <p className="mt-1 text-sm text-muted">
              <span className="text-ink">{t('home.evidence')}: </span>
              {card.evidence}
            </p>
          ) : null}
          {card.recommendation ? (
            <p className="mt-1 text-sm text-muted">
              <span className="text-ink">{t('home.recommendation')}: </span>
              {card.recommendation}
            </p>
          ) : null}
          <FeedbackBar
            targetType="change"
            targetId={card.eventId}
            invalidateKeys={[['intelligence-home']]}
          />
        </div>
      </div>
    </article>
  )
}

function ActionPreview({ action }: { action: ActionCard }) {
  const { t } = useTranslation()
  return (
    <li className="rounded-md border border-mist/80 p-3">
      <p className="text-sm font-medium text-ink">{action.title}</p>
      <p className="mt-1 text-xs text-muted">
        {t('home.actionMeta', {
          minutes: action.estimatedMinutes ?? 0,
          status: action.status ?? 'open',
        })}
      </p>
      <FeedbackBar targetType="action" targetId={action.id} invalidateKeys={[['intelligence-home'], ['actions']]} />
    </li>
  )
}
