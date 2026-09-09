import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { Button, EmptyState, PageHeader, ScorePill, StateBox, StatusBadge } from '../components/ui'
import { dateLocale } from '../i18n'

export default function EventsPage() {
  const { t, i18n } = useTranslation()
  const events = useQuery({ queryKey: ['events'], queryFn: () => api.events('?limit=50') })
  const locale = dateLocale(i18n.language)
  const isEmpty = !events.isLoading && events.data?.length === 0

  return (
    <div>
      <PageHeader title={t('events.title')} subtitle={t('events.subtitle')} />
      {events.isLoading ? <StateBox>{t('events.loading')}</StateBox> : null}
      {events.isError ? (
        <StateBox>{t('common.loadFailed', { message: (events.error as Error).message })}</StateBox>
      ) : null}
      {isEmpty ? (
        <EmptyState
          title={t('events.empty')}
          primary={
            <Link to="/">
              <Button>{t('events.emptyCta')}</Button>
            </Link>
          }
        />
      ) : null}
      {!isEmpty ? (
        <ul className="divide-y divide-mist rounded-xl border border-mist bg-paper/70">
          {events.data?.map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-4 py-4">
              <ScorePill score={e.score} />
              <div className="min-w-0 flex-1">
                <Link to={`/events/${e.id}`} className="font-medium text-ink hover:text-moss">
                  {e.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <StatusBadge status={e.status} />
                  <span className="font-mono tabular-nums">
                    {t('common.itemsCount', { count: e.itemCount ?? 0 })}
                    {e.lastUpdatedAt ? ` · ${new Date(e.lastUpdatedAt).toLocaleString(locale)}` : ''}
                  </span>
                </div>
                {e.summary ? <p className="mt-2 text-sm text-muted">{e.summary}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
