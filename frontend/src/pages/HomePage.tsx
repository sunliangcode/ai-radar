import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ActionCard, type ExperimentCard, type ImpactCard } from '../lib/api'
import { Button, PageHeader, ScorePill, StateBox, StatusBadge } from '../components/ui'
import { FetchProgressPanel } from '../components/FetchProgressPanel'
import { FetchResultSummary } from '../components/FetchResultSummary'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { dateLocale } from '../i18n'
import { useState, type ReactNode } from 'react'

function Column({
  title,
  empty,
  emptyAction,
  children,
}: {
  title: string
  empty: string
  emptyAction?: ReactNode
  children: ReactNode
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children)
  return (
    <section className="min-h-56 rounded-xl border border-mist bg-paper/70 p-4">
      <h3 className="mb-3 font-serif text-lg text-ink">{title}</h3>
      {hasChildren ? (
        <div className="space-y-3">{children}</div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">{empty}</p>
          {emptyAction}
        </div>
      )}
    </section>
  )
}

function hasIntel(data: {
  whatChanged: unknown[]
  whyCare?: unknown[]
  impacts?: unknown[]
  actions?: unknown[]
  whatToWatch: unknown[]
  whatMatters?: unknown[]
} | undefined) {
  if (!data) return false
  return (
    data.whatChanged.length > 0 ||
    (data.whyCare?.length ?? 0) > 0 ||
    (data.impacts?.length ?? 0) > 0 ||
    (data.actions?.length ?? 0) > 0 ||
    data.whatToWatch.length > 0 ||
    (data.whatMatters?.length ?? 0) > 0
  )
}

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const home = useQuery({ queryKey: ['intelligence-home'], queryFn: api.intelligenceHome })
  const briefs = useQuery({ queryKey: ['briefs'], queryFn: api.briefs })
  const sources = useQuery({ queryKey: ['sources'], queryFn: api.sources })
  const experiments = useQuery({ queryKey: ['experiments'], queryFn: api.experiments })
  const [jobToast, setJobToast] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const defaultPack = i18n.language.startsWith('zh') ? 'ai-cn' : 'ai-core'
  const [packId, setPackId] = useState(defaultPack)

  const { fetchJob, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['intelligence-home'],
    ['events'],
    ['items'],
    ['briefs'],
    ['sources'],
  ])
  const pushJob = useMutation({
    mutationFn: api.pushJob,
    onSuccess: () => {
      setJobToast(t('home.pushDone'))
      setTimeout(() => setJobToast(null), 2500)
    },
    onError: (e) => {
      setJobToast((e as Error).message)
      setTimeout(() => setJobToast(null), 4000)
    },
  })
  const impactJob = useMutation({
    mutationFn: api.impactJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      setJobToast(t('home.impactDone'))
      setTimeout(() => setJobToast(null), 2500)
    },
    onError: (e) => {
      setJobToast((e as Error).message)
      setTimeout(() => setJobToast(null), 4000)
    },
  })
  const patchAction = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.patchAction(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      qc.invalidateQueries({ queryKey: ['experiments'] })
    },
  })
  const saveExperiment = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.updateExperiment(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['experiments'] })
      qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      setJobToast(t('home.experimentSaved'))
      setTimeout(() => setJobToast(null), 2500)
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
  const locale = dateLocale(i18n.language)
  const sourceCount = sources.data?.length ?? 0
  const ready = hasIntel(data)
  const showGettingStarted = !home.isLoading && !home.isError && !ready
  const runningExperiments = (experiments.data ?? []).filter((e) => e.status === 'running')

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
              <>
                <Button
                  variant="ghost"
                  loading={impactJob.isPending}
                  onClick={() => impactJob.mutate()}
                >
                  {t('home.recomputeImpact')}
                </Button>
                <Button
                  variant="text"
                  disabled={pushJob.isPending || isPending}
                  loading={pushJob.isPending}
                  onClick={() => pushJob.mutate()}
                >
                  {pushJob.isPending ? t('common.pushing') : t('home.pushNow')}
                </Button>
              </>
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
          {data.outcomeSummary ? (
            <div className="mb-6 rounded-xl border border-mist bg-paper/70 p-4 text-sm text-muted">
              <span className="font-medium text-ink">{t('home.roiTitle')}</span>{' '}
              {t('home.roiLine', {
                insights: data.outcomeSummary.insights ?? 0,
                actions: data.outcomeSummary.actions ?? 0,
                experiments: data.outcomeSummary.experiments ?? 0,
                hours: data.outcomeSummary.timeSavedHours ?? 0,
                roi: data.outcomeSummary.roi ?? '—',
              })}
            </div>
          ) : null}

          <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted">
            {latestBrief ? (
              <Link className="text-moss underline underline-offset-2" to={`/briefs/${latestBrief}`}>
                {t('home.latestBrief', { date: latestBrief })}
              </Link>
            ) : (
              <span>{t('home.noBrief')}</span>
            )}
            <Link className="text-moss underline underline-offset-2" to="/contexts">
              {t('nav.contexts')}
            </Link>
            <Link className="text-moss underline underline-offset-2" to="/events">
              {t('home.allEvents')}
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Column title={t('home.whatChanged')} empty={t('home.whatChangedEmpty')}>
              {data.whatChanged.map((row, i) => (
                <div key={`${row.eventId}-${i}`} className="border-b border-mist/70 pb-2 last:border-0">
                  <Link to={`/events/${row.eventId}`} className="text-sm font-medium text-ink hover:text-moss">
                    {row.label}
                  </Link>
                  <p className="mt-0.5 font-mono text-xs text-muted">
                    {row.eventTitle ? `${row.eventTitle} · ` : ''}
                    {row.at ? new Date(row.at).toLocaleString(locale) : ''}
                  </p>
                </div>
              ))}
            </Column>

            <Column title={t('home.whyCare')} empty={t('home.whyCareEmpty')}>
              {(data.whyCare ?? []).map((card) => (
                <ImpactWhyCard key={card.id} card={card} />
              ))}
            </Column>

            <Column title={t('home.whatIsImpact')} empty={t('home.whatIsImpactEmpty')}>
              {(data.impacts ?? []).map((card) => (
                <ImpactExplainCard
                  key={card.id}
                  card={card}
                  expanded={expanded === card.id}
                  onToggle={() => setExpanded(expanded === card.id ? null : card.id)}
                />
              ))}
            </Column>

            <Column title={t('home.whatShouldIDo')} empty={t('home.whatShouldIDoEmpty')}>
              {(data.opportunities ?? []).slice(0, 4).map((o) => (
                <div key={`opp-${o.id}`} className="border-b border-mist/70 pb-2 last:border-0">
                  <p className="text-sm font-medium text-ink">{o.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {t('home.estimatedHours', { hours: o.estimatedHours ?? 0 })}
                  </p>
                </div>
              ))}
              {(data.risks ?? []).slice(0, 3).map((o) => (
                <div key={`risk-${o.id}`} className="border-b border-mist/70 pb-2 last:border-0">
                  <p className="text-sm font-medium text-ink">{o.title}</p>
                  <p className="mt-1 text-xs font-medium text-ink">{t('home.risk')}</p>
                </div>
              ))}
              {(data.actions ?? []).map((action) => (
                <ActionRow
                  key={action.id}
                  action={action}
                  busy={patchAction.isPending}
                  onStatus={(status) => patchAction.mutate({ id: action.id, status })}
                />
              ))}
            </Column>

            <Column title={t('home.whatToWatch')} empty={t('home.whatToWatchEmpty')}>
              {data.whatToWatch.map((item, idx) => (
                <div key={`${item.id ?? item.eventId}-${idx}`} className="border-b border-mist/70 pb-2 last:border-0">
                  {item.eventId || item.id ? (
                    <Link
                      to={`/events/${item.eventId ?? item.id}`}
                      className="text-sm font-medium text-ink hover:text-moss"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-ink">{item.title}</p>
                  )}
                  <p className="mt-1 text-sm text-muted">{item.watchNext || item.why || item.recommendation}</p>
                </div>
              ))}
            </Column>
          </div>

          {runningExperiments.length > 0 ? (
            <section className="mt-6 rounded-xl border border-mist bg-paper/70 p-4">
              <h3 className="mb-3 font-serif text-lg text-ink">{t('home.experiments')}</h3>
              <div className="space-y-4">
                {runningExperiments.map((exp) => (
                  <ExperimentForm
                    key={exp.id}
                    experiment={exp}
                    saving={saveExperiment.isPending}
                    onSave={(body) => saveExperiment.mutate({ id: exp.id, body })}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function ImpactWhyCard({ card }: { card: ImpactCard }) {
  return (
    <div className="border-b border-mist/70 pb-3 last:border-0">
      <div className="flex gap-3">
        <ScorePill score={card.priority ? Math.min(100, card.priority / 1000) : card.relevance} />
        <div>
          <Link to={`/events/${card.eventId}`} className="font-medium text-ink hover:text-moss">
            {card.title}
          </Link>
          {card.tier ? (
            <div className="mt-1">
              <StatusBadge status={card.tier} />
            </div>
          ) : null}
          <p className="mt-1 text-sm text-muted">{card.why}</p>
        </div>
      </div>
    </div>
  )
}

function ImpactExplainCard({
  card,
  expanded,
  onToggle,
}: {
  card: ImpactCard
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="border-b border-mist/70 pb-3 last:border-0">
      <button type="button" className="w-full text-left" onClick={onToggle}>
        <p className="font-medium text-ink">{card.title}</p>
        <p className="mt-1 text-xs text-muted">
          R{Math.round(card.relevance ?? 0)} · I{Math.round(card.impact ?? 0)} · U
          {Math.round(card.urgency ?? 0)} · {card.tier}
        </p>
      </button>
      {expanded ? (
        <div className="mt-2 space-y-1 text-sm text-muted">
          <p>
            <span className="text-ink">{t('home.evidence')}:</span> {card.evidence}
          </p>
          <p>
            <span className="text-ink">{t('home.reasoning')}:</span> {card.why}
          </p>
          <p>
            <span className="text-ink">{t('home.recommendation')}:</span> {card.recommendation}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function ActionRow({
  action,
  busy,
  onStatus,
}: {
  action: ActionCard
  busy: boolean
  onStatus: (status: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-md border border-mist/80 p-3">
      <p className="text-sm font-medium text-ink">{action.title}</p>
      <p className="mt-1 text-xs text-muted">
        {t('home.actionMeta', {
          minutes: action.estimatedMinutes ?? 0,
          status: action.status ?? 'open',
        })}
      </p>
      {action.successCriteria ? (
        <p className="mt-1 text-xs text-muted">{action.successCriteria}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="ghost" disabled={busy} onClick={() => onStatus('started')}>
          {t('home.start')}
        </Button>
        <Button variant="text" disabled={busy} onClick={() => onStatus('watching')}>
          {t('home.watch')}
        </Button>
        <Button variant="text" disabled={busy} onClick={() => onStatus('ignored')}>
          {t('home.ignore')}
        </Button>
      </div>
    </div>
  )
}

function ExperimentForm({
  experiment,
  saving,
  onSave,
}: {
  experiment: ExperimentCard
  saving: boolean
  onSave: (body: Record<string, unknown>) => void
}) {
  const { t } = useTranslation()
  const [successRate, setSuccessRate] = useState('80')
  const [tokenCost, setTokenCost] = useState('5')
  const [reviewTimeMin, setReviewTimeMin] = useState('30')

  return (
    <div className="rounded-md border border-mist/80 p-3">
      <p className="text-sm font-medium text-ink">{experiment.title}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-muted">
          {t('home.successRate')}
          <input
            className="mt-1 w-full rounded-md border border-mist px-2 py-1 text-sm"
            value={successRate}
            onChange={(e) => setSuccessRate(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted">
          {t('home.tokenCost')}
          <input
            className="mt-1 w-full rounded-md border border-mist px-2 py-1 text-sm"
            value={tokenCost}
            onChange={(e) => setTokenCost(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted">
          {t('home.reviewTime')}
          <input
            className="mt-1 w-full rounded-md border border-mist px-2 py-1 text-sm"
            value={reviewTimeMin}
            onChange={(e) => setReviewTimeMin(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-2">
        <Button
          loading={saving}
          onClick={() =>
            onSave({
              successRate: Number(successRate),
              tokenCost: Number(tokenCost),
              reviewTimeMin: Number(reviewTimeMin),
              status: 'completed',
            })
          }
        >
          {t('home.saveExperiment')}
        </Button>
      </div>
    </div>
  )
}
