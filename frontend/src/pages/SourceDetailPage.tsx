import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { PageHeader, ScoreBar, StateBox } from '../components/ui'
import { errorText } from '../lib/errors'

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
  if (q.isError) return <StateBox>{t('common.loadFailed', { message: errorText(q.error, t) })}</StateBox>
  if (!q.data) return <StateBox>{t('sources.notFound')}</StateBox>

  const s = q.data
  const configEntries = Object.entries(s.config ?? {})

  return (
    <div>
      <PageHeader
        title={s.name}
        subtitle={`${s.type} · ${s.enabled ? t('sources.statusEnabled') : t('sources.statusDisabled')}`}
        actions={
          <Link to="/settings/sources" className="text-sm text-moss underline underline-offset-2">
            {t('common.backToList')}
          </Link>
        }
      />

      <section className="mb-6 rounded-xl border border-border bg-surface/80 p-4">
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
      <div className="rounded-xl border border-border bg-surface/70 px-4">
        {s.sampleItems?.map((item) => (
          <article key={item.id} className="row-py border-b border-border/70 last:border-0">
            <div className="flex items-start gap-3">
              <div className="pt-0.5 w-12 shrink-0">
                <ScoreBar score={item.score} size="sm" />
              </div>
              <div className="min-w-0 flex-1">
                <a
                  href={item.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ink transition duration-150 hover:underline"
                >
                  {item.title}
                </a>
                {item.summary ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                    {item.summary}
                  </p>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
