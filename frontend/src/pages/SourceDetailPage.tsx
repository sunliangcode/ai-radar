import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { ItemRow, PageHeader, StateBox } from '../components/ui'

export default function SourceDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const sourceId = Number(id)
  const q = useQuery({
    queryKey: ['source', sourceId],
    queryFn: () => api.source(sourceId),
    enabled: Number.isFinite(sourceId),
  })

  if (q.isLoading) return <StateBox>{t('common.loading')}</StateBox>
  if (q.isError) return <StateBox>{t('common.loadFailed', { message: (q.error as Error).message })}</StateBox>
  if (!q.data) return <StateBox>{t('sources.notFound')}</StateBox>

  const s = q.data
  return (
    <div>
      <PageHeader
        title={s.name}
        subtitle={`${s.type} · ${s.enabled ? t('sources.statusEnabled') : t('sources.statusDisabled')}`}
        actions={
          <Link to="/sources" className="text-sm text-moss underline underline-offset-2">
            {t('common.backToList')}
          </Link>
        }
      />
      <pre className="mb-6 overflow-x-auto rounded-xl border border-mist bg-paper/80 p-4 font-mono text-xs text-muted">
        {JSON.stringify(s.config ?? {}, null, 2)}
      </pre>
      <h3 className="mb-2 font-serif text-xl">{t('sources.sampleItems')}</h3>
      {!s.sampleItems?.length ? <StateBox>{t('sources.noSampleItems')}</StateBox> : null}
      <div className="rounded-xl border border-mist bg-paper/70 px-4">
        {s.sampleItems?.map((item) => (
          <ItemRow
            key={item.id}
            title={item.title}
            score={item.score}
            summary={item.summary}
            url={item.canonicalUrl}
          />
        ))}
      </div>
    </div>
  )
}
