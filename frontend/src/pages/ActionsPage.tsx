import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type ActionCard } from '../lib/api'
import { FeedbackBar } from '../components/feedback/FeedbackBar'
import { EmptyState, ListSkeleton, PageHeader, QueryErrorState, StatusBadge, useToast } from '../components/ui'
import { useDisplaySources } from '../hooks/useDisplaySources'
import { changeMatchesDisplay } from '../lib/sourceFilter'
import { errorText } from '../lib/errors'
import { cn, focusRingClass, textLinkClass } from '../lib/cn'

type Filter = 'open' | 'watching' | 'started' | 'useful' | 'ignored' | 'all'

const STATUS_ORDER: Filter[] = ['open', 'watching', 'started', 'useful', 'ignored']

export default function ActionsPage() {
  const { t } = useTranslation()
  const { displaySourceIds } = useDisplaySources()
  const actions = useQuery({ queryKey: ['actions'], queryFn: api.actions })
  const [filter, setFilter] = useState<Filter>('open')

  const grouped = useMemo(() => {
    const list = (actions.data ?? []).filter((a) => changeMatchesDisplay(a, displaySourceIds))
    const byStatus: Record<string, ActionCard[]> = {}
    for (const action of list) {
      const status = action.status ?? 'open'
      if (!byStatus[status]) byStatus[status] = []
      byStatus[status].push(action)
    }
    return byStatus
  }, [actions.data, displaySourceIds])

  const visibleStatuses = useMemo(() => {
    if (filter === 'all') {
      return STATUS_ORDER.filter((s) => (grouped[s] ?? []).length > 0)
    }
    return [filter]
  }, [filter, grouped])

  const filters: Filter[] = ['open', 'watching', 'started', 'useful', 'ignored', 'all']

  return (
    <div aria-busy={actions.isFetching || undefined}>
      <PageHeader
        title={t('actions.title')}
        subtitle={t('actions.subtitle')}
        back={{ label: t('common.backToList'), to: '/settings' }}
      />
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label={t('actions.filterLabel')}>
        {filters.map((f) => {
          const count = f !== 'all' ? grouped[f]?.length ?? 0 : 0
          const label =
            f !== 'all' && count > 0
              ? `${t(`actions.filter.${f}`)} (${count})`
              : t(`actions.filter.${f}`)
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              aria-label={label}
              className={cn(
                'min-h-9 rounded-sm px-3 py-1.5 text-xs font-medium transition motion-reduce:transition-none',
                focusRingClass(),
                filter === f ? 'bg-ink text-surface' : 'bg-border/60 text-muted hover:text-ink',
              )}
            >
              {t(`actions.filter.${f}`)}
              {f !== 'all' && count ? (
                <span className="ml-1.5 tabular-nums opacity-70" aria-hidden>
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {actions.isLoading ? <ListSkeleton rows={4} /> : null}
      {actions.isError ? (
        <QueryErrorState
          message={t('common.loadFailed', { message: errorText(actions.error, t) })}
          onRetry={() => void actions.refetch()}
        />
      ) : null}
      {!actions.isLoading && visibleStatuses.every((s) => !(grouped[s]?.length)) ? (
        <EmptyState
          title={t('actions.empty')}
          description={t('actions.emptyHint')}
          primary={
            <Link
              to="/"
              className={cn(
                'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
                focusRingClass(),
              )}
            >
              {t('actions.goToday')}
            </Link>
          }
        />
      ) : null}

      <div className="space-y-8">
        {visibleStatuses.map((status) => {
          const rows = grouped[status] ?? []
          if (rows.length === 0) return null
          return (
            <section
              key={status}
              aria-labelledby={filter === 'all' ? `actions-status-${status}` : undefined}
              aria-label={filter === 'all' ? undefined : t(`actions.filter.${status}`)}
            >
              {filter === 'all' ? (
                <h2 id={`actions-status-${status}`} className="mb-3 font-serif text-lg text-ink">
                  {t(`actions.filter.${status}`)}
                  <span className="ml-2 font-sans text-sm text-muted tabular-nums">{rows.length}</span>
                </h2>
              ) : null}
              <ul className="space-y-3" aria-busy={actions.isFetching || undefined}>
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
    onError: (err) => pushToast('error', t('common.loadFailed', { message: errorText(err, t) })),
  })

  const status = action.status ?? 'open'
  const quickStatuses: Array<{ value: string; labelKey: string }> = [
    { value: 'started', labelKey: 'actions.markStarted' },
    { value: 'useful', labelKey: 'actions.markUseful' },
    { value: 'ignored', labelKey: 'actions.markIgnored' },
  ]

  return (
    <li className="border-b border-border/80 py-4 first:pt-0 last:border-0">
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
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label={t('actions.statusActions')}
          aria-busy={patch.isPending || undefined}
        >
          {quickStatuses.map((qs) => {
            const active = status === qs.value
            return (
              <button
                key={qs.value}
                type="button"
                disabled={patch.isPending || active}
                aria-pressed={active}
                onClick={() => patch.mutate(qs.value)}
                className={cn(
                  'min-h-9 rounded-sm border px-2.5 py-1 text-xs transition motion-reduce:transition-none disabled:opacity-40',
                  focusRingClass(),
                  active
                    ? 'border-ink/30 bg-ink/5 text-ink'
                    : 'border-border bg-surface text-muted hover:border-accent/40 hover:text-ink',
                )}
              >
                {t(qs.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      {action.steps?.length ? (
        <ul className="mt-3 space-y-2" aria-label={t('actions.stepsLabel')}>
          {action.steps.map((step, i) => {
            const stepId = `action-${action.id}-step-${i}`
            const done = !!doneSteps[i]
            return (
              <li key={`${action.id}-${i}`} className="flex items-start gap-2 text-sm text-ink/85">
                <button
                  type="button"
                  role="checkbox"
                  onClick={() => setDoneSteps((prev) => ({ ...prev, [i]: !prev[i] }))}
                  className={cn(
                    'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border text-xs sm:h-5 sm:w-5 sm:text-[10px]',
                    focusRingClass(),
                    done
                      ? 'border-moss bg-moss text-surface'
                      : 'border-border text-transparent hover:border-accent',
                  )}
                  aria-checked={done}
                  aria-labelledby={stepId}
                >
                  <span aria-hidden>✓</span>
                </button>
                <span id={stepId} className={done ? 'text-muted line-through' : ''}>
                  {step}
                </span>
              </li>
            )
          })}
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
            className={`inline-flex min-h-9 items-center ${textLinkClass('moss')}`}
          >
            {t('actions.relatedChange')}
          </Link>
        ) : null}
        {action.newsItemId ? (
          <Link to="/radar" className={`inline-flex min-h-9 items-center ${textLinkClass('moss')}`}>
            {t('actions.relatedItem')}
          </Link>
        ) : null}
      </div>
      <FeedbackBar targetType="action" targetId={action.id} invalidateKeys={[['actions']]} />
    </li>
  )
}
