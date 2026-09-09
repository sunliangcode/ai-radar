import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { api } from '../lib/api'
import { Button, EmptyState, PageHeader, StateBox } from '../components/ui'
import { FetchProgressPanel } from '../components/FetchProgressPanel'
import { FetchResultSummary } from '../components/FetchResultSummary'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { dateLocale } from '../i18n'

export default function BriefsPage() {
  const { t, i18n } = useTranslation()
  const briefs = useQuery({ queryKey: ['briefs'], queryFn: api.briefs })
  const { fetchJob, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['briefs'],
    ['intelligence-home'],
  ])
  const [toast, setToast] = useState<string | null>(null)
  const pushJob = useMutation({
    mutationFn: api.pushJob,
    onSuccess: () => {
      setToast(t('briefs.pushDone'))
      setTimeout(() => setToast(null), 2500)
    },
    onError: (e) => {
      setToast((e as Error).message)
      setTimeout(() => setToast(null), 4000)
    },
  })
  const locale = dateLocale(i18n.language)
  const isEmpty = !briefs.isLoading && briefs.data?.length === 0

  return (
    <div>
      <PageHeader
        title={t('briefs.title')}
        subtitle={t('briefs.subtitle')}
        actions={
          <>
            <Button onClick={() => fetchJob.mutate()} loading={isPending}>
              {phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => pushJob.mutate()}
              loading={pushJob.isPending}
              disabled={isPending}
            >
              {pushJob.isPending ? t('common.pushing') : t('briefs.pushToday')}
            </Button>
          </>
        }
      />

      {phase === 'running' ? <FetchProgressPanel progress={progress} /> : null}
      {phase === 'summary' ? <FetchResultSummary progress={progress} onDismiss={() => void dismiss()} /> : null}
      {toast ? (
        <p className="mb-4 text-sm text-moss" role="status">
          {toast}
        </p>
      ) : null}

      {briefs.isLoading ? <StateBox>{t('briefs.loading')}</StateBox> : null}
      {briefs.isError ? (
        <StateBox>{t('common.loadFailed', { message: (briefs.error as Error).message })}</StateBox>
      ) : null}
      {isEmpty ? (
        <EmptyState
          title={t('briefs.emptyTitle')}
          description={t('briefs.emptyDescription')}
          primary={
            <Button onClick={() => fetchJob.mutate()} loading={isPending}>
              {t('common.fetchNow')}
            </Button>
          }
        />
      ) : null}
      {!isEmpty ? (
        <ul className="divide-y divide-mist rounded-xl border border-mist bg-paper/70">
          {briefs.data?.map((b) => (
            <li key={b.date} className="px-4 py-3">
              <Link className="font-mono text-sm text-moss hover:underline" to={`/briefs/${b.date}`}>
                {b.date}
              </Link>
              {b.modifiedAt ? (
                <span className="ml-3 text-xs text-muted">{new Date(b.modifiedAt).toLocaleString(locale)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
