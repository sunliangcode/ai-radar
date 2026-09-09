import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { PageHeader, ScorePill, StateBox, StatusBadge } from '../components/ui'
import { dateLocale } from '../i18n'

export default function EventDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const eventId = Number(id)
  const q = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => api.event(eventId),
    enabled: Number.isFinite(eventId),
  })
  const locale = dateLocale(i18n.language)

  if (q.isLoading) return <StateBox>{t('events.loading')}</StateBox>
  if (q.isError) return <StateBox>{t('common.loadFailed', { message: (q.error as Error).message })}</StateBox>
  if (!q.data) return <StateBox>{t('common.notFound')}</StateBox>

  const e = q.data
  return (
    <div>
      <PageHeader
        title={e.title}
        subtitle={t('events.scoreLabel', {
          status: t(`events.status.${e.status}`, { defaultValue: e.status }),
          score: e.score ?? '—',
        })}
        actions={
          <Link to="/events" className="text-sm text-moss underline underline-offset-2">
            {t('common.backToList')}
          </Link>
        }
      />
      <div className="mb-4">
        <StatusBadge status={e.status} />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-mist bg-paper/70 p-4 md:col-span-2">
          <h3 className="mb-2 font-serif text-lg">{t('events.summary')}</h3>
          <p className="text-sm leading-relaxed text-muted">{e.summary || t('events.noSummary')}</p>
        </div>
        <div className="rounded-xl border border-mist bg-paper/70 p-4">
          <h3 className="mb-2 font-serif text-lg">{t('events.impact')}</h3>
          <p className="text-sm text-muted">{e.impact || '—'}</p>
          <h3 className="mb-2 mt-4 font-serif text-lg">{t('events.watchNext')}</h3>
          <p className="text-sm text-muted">{e.watchNext || '—'}</p>
        </div>
      </div>

      <h3 className="mb-3 font-serif text-xl">{t('events.timeline')}</h3>
      {!e.timeline?.length ? <StateBox>{t('events.noTimeline')}</StateBox> : null}
      <ol className="mb-8 space-y-3 border-l-2 border-moss/30 pl-4">
        {e.timeline?.map((node) => (
          <li key={node.id} className="relative">
            <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-moss" />
            <p className="font-mono text-xs text-muted">
              {node.at ? new Date(node.at).toLocaleString(locale) : ''}
            </p>
            <p className="text-sm font-medium text-ink">{node.label}</p>
            {node.note ? <p className="text-sm text-muted">{node.note}</p> : null}
          </li>
        ))}
      </ol>

      <h3 className="mb-3 font-serif text-xl">{t('events.sourcesItems')}</h3>
      <div className="rounded-xl border border-mist bg-paper/70 px-4">
        {e.items?.map((item) => (
          <article key={item.id} className="flex gap-3 border-b border-mist/80 py-3 last:border-0">
            <ScorePill score={item.score} />
            <div>
              <a href={item.canonicalUrl} target="_blank" rel="noreferrer" className="font-medium hover:text-moss">
                {item.title}
              </a>
              {item.summary ? <p className="mt-1 text-sm text-muted">{item.summary}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
