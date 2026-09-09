import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type ActionCard } from '../lib/api'
import { FeedbackBar } from '../components/FeedbackBar'
import { EmptyState, PageHeader, StateBox, StatusBadge } from '../components/ui'

type Filter = 'all' | 'open' | 'watching' | 'started' | 'useful' | 'ignored'

export default function ActionsPage() {
  const { t } = useTranslation()
  const actions = useQuery({ queryKey: ['actions'], queryFn: api.actions })
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const list = actions.data ?? []
    if (filter === 'all') return list
    if (filter === 'open') return list.filter((a) => a.status === 'open' || !a.status)
    if (filter === 'started') return list.filter((a) => a.status === 'started' || a.status === 'useful')
    return list.filter((a) => a.status === filter)
  }, [actions.data, filter])

  const filters: Filter[] = ['all', 'open', 'watching', 'started', 'ignored']

  return (
    <div>
      <PageHeader title={t('actions.title')} subtitle={t('actions.subtitle')} />
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-sm px-3 py-1.5 text-xs font-medium transition ${
              filter === f ? 'bg-ink text-paper' : 'bg-mist/60 text-muted hover:text-ink'
            }`}
          >
            {t(`actions.filter.${f}`)}
          </button>
        ))}
      </div>

      {actions.isLoading ? <StateBox>{t('actions.loading')}</StateBox> : null}
      {actions.isError ? (
        <StateBox>{t('common.loadFailed', { message: (actions.error as Error).message })}</StateBox>
      ) : null}
      {!actions.isLoading && filtered.length === 0 ? (
        <EmptyState title={t('actions.empty')} description={t('actions.emptyHint')} />
      ) : null}

      <ul className="space-y-3">
        {filtered.map((action) => (
          <ActionRow key={action.id} action={action} />
        ))}
      </ul>
    </div>
  )
}

function ActionRow({ action }: { action: ActionCard }) {
  const { t } = useTranslation()
  return (
    <li className="rounded-xl border border-mist bg-paper/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-ink">{action.title}</p>
        {action.status ? <StatusBadge status={action.status} /> : null}
      </div>
      <p className="mt-1 text-xs text-muted">
        {t('home.actionMeta', {
          minutes: action.estimatedMinutes ?? 0,
          status: action.status ?? 'open',
        })}
      </p>
      {action.successCriteria ? <p className="mt-2 text-sm text-muted">{action.successCriteria}</p> : null}
      {action.steps?.length ? (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
          {action.steps.map((step, i) => (
            <li key={`${action.id}-${i}`}>{step}</li>
          ))}
        </ol>
      ) : null}
      {action.eventId ? (
        <p className="mt-2 text-sm">
          <Link to={`/changes/${action.eventId}`} className="text-moss underline underline-offset-2">
            {t('actions.relatedChange')}
          </Link>
        </p>
      ) : null}
      <FeedbackBar targetType="action" targetId={action.id} invalidateKeys={[['actions']]} />
    </li>
  )
}
