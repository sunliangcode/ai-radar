import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { ItemRow, PageHeader, StateBox } from '../components/ui'

function formatConfigValue(value: unknown): string {
  if (value == null) return '—'
  if (Array.isArray(value)) return value.map(String).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

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
  const configEntries = Object.entries(s.config ?? {})

  return (
    <div>
      <PageHeader
        title={s.name}
        subtitle={`${s.type} · ${s.enabled ? t('sources.statusEnabled') : t('sources.statusDisabled')}`}
        actions={
          <Link to="/contexts" className="text-sm text-moss underline underline-offset-2">
            {t('common.backToList')}
          </Link>
        }
      />

      <section className="mb-6 rounded-xl border border-mist bg-paper/80 p-4">
        <h3 className="mb-3 font-serif text-lg text-ink">{t('sources.config')}</h3>
        {configEntries.length === 0 ? (
          <p className="text-sm text-muted">—</p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2">
            {configEntries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs uppercase tracking-wide text-muted">{key}</dt>
                <dd className="mt-1 break-all text-sm text-ink">{formatConfigValue(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

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
