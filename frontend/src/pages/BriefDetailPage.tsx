import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { PageHeader, StateBox } from '../components/ui'

export default function BriefDetailPage() {
  const { t } = useTranslation()
  const { date = '' } = useParams()
  const q = useQuery({
    queryKey: ['brief', date],
    queryFn: () => api.brief(date),
    enabled: Boolean(date),
  })

  if (q.isLoading) return <StateBox>{t('briefs.loading')}</StateBox>
  if (q.isError) return <StateBox>{t('common.loadFailed', { message: (q.error as Error).message })}</StateBox>
  if (!q.data) return <StateBox>{t('common.notFound')}</StateBox>

  return (
    <div>
      <PageHeader
        title={t('briefs.detailTitle', { date: q.data.date })}
        actions={
          <Link to="/briefs" className="text-sm text-moss underline underline-offset-2">
            {t('common.backToList')}
          </Link>
        }
      />
      <article className="prose-brief rounded-xl border border-mist bg-paper/80 p-5 md:p-8">
        <ReactMarkdown>{q.data.markdown}</ReactMarkdown>
      </article>
    </div>
  )
}
