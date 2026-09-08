import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { Button, PageHeader, StateBox } from '../components/ui'
import { dateLocale } from '../i18n'

export default function BriefsPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const briefs = useQuery({ queryKey: ['briefs'], queryFn: api.briefs })
  const fetchJob = useMutation({
    mutationFn: api.fetchJob,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['briefs'] }),
  })
  const pushJob = useMutation({ mutationFn: api.pushJob })
  const locale = dateLocale(i18n.language)

  return (
    <div>
      <PageHeader
        title={t('briefs.title')}
        subtitle={t('briefs.subtitle')}
        actions={
          <>
            <Button onClick={() => fetchJob.mutate()} disabled={fetchJob.isPending}>
              {t('briefs.generate')}
            </Button>
            <Button variant="ghost" onClick={() => pushJob.mutate()} disabled={pushJob.isPending}>
              {t('briefs.pushToday')}
            </Button>
          </>
        }
      />
      {briefs.isLoading ? <StateBox>{t('briefs.loading')}</StateBox> : null}
      {briefs.isError ? (
        <StateBox>{t('common.loadFailed', { message: (briefs.error as Error).message })}</StateBox>
      ) : null}
      {!briefs.isLoading && briefs.data?.length === 0 ? <StateBox>{t('briefs.empty')}</StateBox> : null}
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
    </div>
  )
}
