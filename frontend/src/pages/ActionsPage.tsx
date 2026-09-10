import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type ActionCard } from '../lib/api'
import { FeedbackBar } from '../components/FeedbackBar'
import { EmptyState, ListSkeleton, PageHeader, StateBox, StatusBadge, useToast } from '../components/ui'

type Filter = 'open' | 'watching' | 'started' | 'useful' | 'ignored' | 'all'

const STATUS_ORDER: Filter[] = ['open', 'watching', 'started', 'useful', 'ignored']

export default function ActionsPage() {
  const { t } = useTranslation()
  const actions = useQuery({ queryKey: ['actions'], queryFn: api.actions })
  const [filter, setFilter] = useState<Filter>('open')

  const grouped = useMemo(() => {
    const list = actions.data ?? []
    const byStatus: Record<string, ActionCard[]> = {}
    for (const action of list) {
      const status = action.status ?? 'open'
      if (!byStatus[status]) byStatus[status] = []
      byStatus[status].push(action)
    }
    return byStatus
  }, [actions.data])

  const visibleStatuses = useMemo(() => {
    if (filter === 'all') {
      return STATUS_ORDER.filter((s) => (grouped[s] ?? []).length > 0)
    }
    return [filter]
  }, [filter, grouped])

  const filters: Filter[] = ['open', 'watching', 'started', 'useful', 'ignored', 'all']

  return (
    <div>
      <PageHeader title={t('actions.title')} subtitle={t('actions.subtitle')} />
      <div className="mb-5 flex flex-wrap gap-2">
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
            {f !== 'all' && grouped[f]?.length ? (
              <span className="ml-1.5 tabular-nums opacity-70">{grouped[f].length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {actions.isLoading ? <ListSkeleton rows={4} /> : null}
      {actions.isError ? (
        <StateBox>{t('common.loadFailed', { message: (actions.error as Error).message })}</StateBox>
      ) : null}
      {!actions.isLoading && visibleStatuses.every((s) => !(grouped[s]?.length)) ? (
        <EmptyState title={t('actions.empty')} description={t('actions.emptyHint')} />
      ) : null}

      <div className="space-y-8">
        {visibleStatuses.map((status) => {
          const rows = grouped[status] ?? []
          if (rows.length === 0) return null
          return (
            <section key={status}>
              {filter === 'all' ? (
                <h2 className="mb-3 font-serif text-lg text-ink">
                  {t(`actions.filter.${status}`)}
                  <span className="ml-2 font-sans text-sm text-muted tabular-nums">{rows.length}</span>
                </h2>
              ) : null}
              <ul className="space-y-3">
                {rows.map((action) => (
                  <ActionRow key={action.id} action={action} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function ActionRow({ action }: { action: ActionCard }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const [doneSteps, setDoneSteps] = useState<Record<number, boolean>>({})
  const patch = useMutation({
    mutationFn: (status: string) => api.patchAction(action.id, { status }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['actions'] })
      pushToast('success', t('actions.statusUpdated'))
    },
    onError: (err) => pushToast('error', t('common.loadFailed', { message: (err as Error).message })),
  })

  const status = action.status ?? 'open'
  const quickStatuses: Array<{ value: string; labelKey: string }> = [
    { value: 'started', labelKey: 'actions.markStarted' },
    { value: 'useful', labelKey: 'actions.markUseful' },
    { value: 'ignored', labelKey: 'actions.markIgnored' },
  ]

  return (
    <li className="border-b border-mist/80 py-4 first:pt-0 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-ink">{action.title}</h3>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {t('home.actionMeta', {
              minutes: action.estimatedMinutes ?? 0,
              status,
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickStatuses.map((qs) => (
            <button
              key={qs.value}
              type="button"
              disabled={patch.isPending || status === qs.value}
              onClick={() => patch.mutate(qs.value)}
              className="rounded-sm border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:border-accent/40 hover:text-ink disabled:opacity-40"
            >
              {t(qs.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {action.steps?.length ? (
        <ul className="mt-3 space-y-2">
          {action.steps.map((step, i) => (
            <li key={`${action.id}-${i}`} className="flex items-start gap-2 text-sm text-ink/85">
              <button
                type="button"
                onClick={() => setDoneSteps((prev) => ({ ...prev, [i]: !prev[i] }))}
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border text-[10px] ${
                  doneSteps[i]
                    ? 'border-moss bg-moss text-paper'
                    : 'border-mist text-transparent hover:border-accent'
                }`}
                aria-pressed={!!doneSteps[i]}
              >
                ✓
              </button>
              <span className={doneSteps[i] ? 'text-muted line-through' : ''}>{step}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {action.successCriteria ? (
        <p className="mt-3 text-sm text-muted">
          <span className="text-faint">{t('actions.successCriteria')}: </span>
          {action.successCriteria}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {action.eventId ? (
          <Link
            to={`/changes/${action.eventId}`}
            state={{ from: '/actions' }}
            className="text-moss underline underline-offset-2"
          >
            {t('actions.relatedChange')}
          </Link>
        ) : null}
        {action.newsItemId ? (
          <Link to={`/feed`} className="text-moss underline underline-offset-2">
            {t('actions.relatedItem')}
          </Link>
        ) : null}
      </div>
      <FeedbackBar targetType="action" targetId={action.id} invalidateKeys={[['actions']]} />
    </li>
  )
}
