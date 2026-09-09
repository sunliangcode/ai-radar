import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
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
  whatMatters: unknown[]
  whatsEmerging: unknown[]
  whatToWatch: unknown[]
} | undefined) {
  if (!data) return false
  return (
    data.whatChanged.length > 0 ||
    data.whatMatters.length > 0 ||
    data.whatsEmerging.length > 0 ||
    data.whatToWatch.length > 0
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
              <Button
                variant="text"
                disabled={pushJob.isPending || isPending}
                loading={pushJob.isPending}
                onClick={() => pushJob.mutate()}
              >
                {pushJob.isPending ? t('common.pushing') : t('home.pushNow')}
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
              <Link
                to="/sources"
                className="inline-block text-sm text-moss underline underline-offset-2"
              >
                {t('home.gettingStarted.addRss')}
              </Link>
            </div>
          ) : null}

          <div className="mt-8 space-y-2">
            <p className="text-sm font-medium text-ink">{t('home.gettingStarted.step2')}</p>
            <p className="text-sm text-muted">{t('home.gettingStarted.updateHint')}</p>
            <div className="pt-1">{updateButton}</div>
          </div>

          <p className="mt-6 text-xs text-muted">{t('home.gettingStarted.step3')}</p>
        </section>
      ) : null}

      {ready && data ? (
        <>
          <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted">
            {latestBrief ? (
              <Link className="text-moss underline underline-offset-2" to={`/briefs/${latestBrief}`}>
                {t('home.latestBrief', { date: latestBrief })}
              </Link>
            ) : (
              <span>{t('home.noBrief')}</span>
            )}
            <Link className="text-moss underline underline-offset-2" to="/events">
              {t('home.allEvents')}
            </Link>
            <Link className="text-moss underline underline-offset-2" to="/items">
              {t('home.rawFeed')}
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Column
              title={t('home.whatChanged')}
              empty={t('home.whatChangedEmpty')}
              emptyAction={
                <Button variant="ghost" loading={isPending} onClick={() => fetchJob.mutate()}>
                  {t('home.emptyColumnCta')}
                </Button>
              }
            >
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
            <Column
              title={t('home.whatMatters')}
              empty={t('home.whatMattersEmpty')}
              emptyAction={
                <Button variant="ghost" loading={isPending} onClick={() => fetchJob.mutate()}>
                  {t('home.emptyColumnCta')}
                </Button>
              }
            >
              {data.whatMatters.map((e) => (
                <EventCard key={e.id} id={e.id} title={e.title} score={e.score} summary={e.summary} status={e.status} />
              ))}
            </Column>
            <Column title={t('home.whatsEmerging')} empty={t('home.whatsEmergingEmpty')}>
              {data.whatsEmerging.map((e) => (
                <EventCard key={e.id} id={e.id} title={e.title} score={e.score} summary={e.summary} status={e.status} />
              ))}
            </Column>
            <Column title={t('home.whatToWatch')} empty={t('home.whatToWatchEmpty')}>
              {data.whatToWatch.map((e) => (
                <div key={e.id} className="border-b border-mist/70 pb-2 last:border-0">
                  <Link to={`/events/${e.id}`} className="text-sm font-medium text-ink hover:text-moss">
                    {e.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{e.watchNext}</p>
                </div>
              ))}
            </Column>
          </div>
        </>
      ) : null}
    </div>
  )
}

function EventCard({
  id,
  title,
  score,
  summary,
  status,
}: {
  id: number
  title: string
  score?: number
  summary?: string
  status?: string
}) {
  return (
    <div className="flex gap-3 border-b border-mist/70 pb-3 last:border-0">
      <ScorePill score={score} />
      <div className="min-w-0">
        <Link to={`/events/${id}`} className="font-medium text-ink transition duration-200 hover:text-moss">
          {title}
        </Link>
        {status ? (
          <div className="mt-1">
            <StatusBadge status={status} />
          </div>
        ) : null}
        {summary ? <p className="mt-1 line-clamp-2 text-sm text-muted">{summary}</p> : null}
      </div>
    </div>
  )
}
