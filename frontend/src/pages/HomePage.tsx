import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { Button, PageHeader, ScorePill, StateBox } from '../components/ui'
import { FetchProgressPanel } from '../components/FetchProgressPanel'
import { FetchResultSummary } from '../components/FetchResultSummary'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { dateLocale } from '../i18n'
import { useState } from 'react'

function Column({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: React.ReactNode
}) {
  return (
    <section className="min-h-64 rounded-xl border border-mist bg-paper/70 p-4">
      <h3 className="mb-3 font-serif text-lg text-ink">{title}</h3>
      <div className="space-y-3">{children || <p className="text-sm text-muted">{empty}</p>}</div>
    </section>
  )
}

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const home = useQuery({ queryKey: ['intelligence-home'], queryFn: api.intelligenceHome })
  const briefs = useQuery({ queryKey: ['briefs'], queryFn: api.briefs })
  const [jobToast, setJobToast] = useState<string | null>(null)

  const { fetchJob, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['intelligence-home'],
    ['events'],
    ['items'],
    ['briefs'],
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
  const clusterJob = useMutation({
    mutationFn: api.clusterJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      setJobToast(t('home.clusterDone'))
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

  return (
    <div>
      <PageHeader
        title={t('home.title')}
        subtitle={t('home.subtitle')}
        actions={
          <>
            <Button disabled={isPending} onClick={() => fetchJob.mutate()} aria-busy={isPending}>
              {phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
            </Button>
            <Button variant="ghost" disabled={clusterJob.isPending || isPending} onClick={() => clusterJob.mutate()}>
              {clusterJob.isPending ? t('home.clustering') : t('home.cluster')}
            </Button>
            <Button variant="ghost" disabled={pushJob.isPending || isPending} onClick={() => pushJob.mutate()}>
              {pushJob.isPending ? t('common.pushing') : t('home.pushNow')}
            </Button>
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
      </div>

      {home.isLoading ? <StateBox>{t('home.loading')}</StateBox> : null}
      {home.isError ? (
        <StateBox>{t('common.loadFailed', { message: (home.error as Error).message })}</StateBox>
      ) : null}

      {data ? (
        <div className="grid gap-4 lg:grid-cols-2">
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
          <Column title={t('home.whatMatters')} empty={t('home.whatMattersEmpty')}>
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
  const { t } = useTranslation()
  return (
    <div className="flex gap-3 border-b border-mist/70 pb-3 last:border-0">
      <ScorePill score={score} />
      <div className="min-w-0">
        <Link to={`/events/${id}`} className="font-medium text-ink hover:text-moss">
          {title}
        </Link>
        {status ? (
          <p className="font-mono text-xs text-muted">
            {t(`events.status.${status}`, { defaultValue: status })}
          </p>
        ) : null}
        {summary ? <p className="mt-1 line-clamp-2 text-sm text-muted">{summary}</p> : null}
      </div>
    </div>
  )
}
