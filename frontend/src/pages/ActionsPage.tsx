import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type ActionCard } from '../lib/api'
import { FeedbackBar } from '../components/feedback/FeedbackBar'
import {
  Button,
  EmptyState,
  ListSkeleton,
  PageHeader,
  QueryErrorState,
  StatusBadge,
  useToast,
} from '../components/ui'
import { useDisplaySources } from '../hooks/useDisplaySources'
import { useEscapeBack } from '../hooks/useEscapeBack'
import { changeMatchesDisplay } from '../lib/sourceFilter'
import { errorText } from '../lib/errors'
import { cn, focusRingClass, textLinkClass } from '../lib/cn'

type Filter = 'open' | 'watching' | 'started' | 'useful' | 'ignored' | 'all'

const STATUS_ORDER: Filter[] = ['open', 'watching', 'started', 'useful', 'ignored']

export default function ActionsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { displaySourceIds, noneSelected, setAllDisplayed } = useDisplaySources()
  const actions = useQuery({ queryKey: ['actions'], queryFn: api.actions })
  const [filter, setFilter] = useState<Filter>('open')

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/settings')
  }, [navigate])
  useEscapeBack(goBack)

  const scoped = useMemo(
    () => (actions.data ?? []).filter((a) => changeMatchesDisplay(a, displaySourceIds)),
    [actions.data, displaySourceIds],
  )

  const grouped = useMemo(() => {
    const byStatus: Record<string, ActionCard[]> = {}
    for (const action of scoped) {
      const status = action.status ?? 'open'
      if (!byStatus[status]) byStatus[status] = []
      byStatus[status].push(action)
    }
    return byStatus
  }, [scoped])

  const visibleStatuses = useMemo(() => {
    if (filter === 'all') {
      return STATUS_ORDER.filter((s) => (grouped[s] ?? []).length > 0)
    }
    return [filter]
  }, [filter, grouped])

  const filters: Filter[] = ['open', 'watching', 'started', 'useful', 'ignored', 'all']

  const visibleCount = useMemo(
    () => visibleStatuses.reduce((n, s) => n + (grouped[s]?.length ?? 0), 0),
    [visibleStatuses, grouped],
  )
  const filterEmpty = !noneSelected && !actions.isLoading && scoped.length > 0 && visibleCount === 0
  const displayFilterEmpty =
    !noneSelected &&
    !actions.isLoading &&
    (actions.data ?? []).length > 0 &&
    scoped.length === 0
  const trulyEmpty =
    !noneSelected && !actions.isLoading && (actions.data ?? []).length === 0

  return (
    <div aria-busy={actions.isFetching || undefined}>
      <PageHeader
        titleId="actions-page-heading"
        title={t('actions.title')}
        subtitle={t('actions.subtitle')}
        back={{ label: t('common.backToList'), onClick: goBack }}
      />

      {noneSelected ? (
        <EmptyState
          title={t('sources.displayNoneActive')}
          description={t('actions.displayNoneHint')}
          primary={
            <Button onClick={setAllDisplayed} aria-label={t('sources.displayRestoreAll')}>
              {t('sources.displayRestoreAll')}
            </Button>
          }
          secondary={
            <Link
              to="/settings/sources"
              className={cn(
                'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
                focusRingClass(),
              )}
            >
              {t('nav.sources')}
            </Link>
          }
        />
      ) : (
        <>
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
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {t('actions.filterResult', {
              filter: t(`actions.filter.${filter}`),
              count: visibleCount,
            })}
          </p>

          {actions.isLoading ? <ListSkeleton rows={4} /> : null}
          {actions.isError ? (
            <QueryErrorState
              message={t('common.loadFailed', { message: errorText(actions.error, t) })}
              onRetry={() => void actions.refetch()}
            />
          ) : null}
          {displayFilterEmpty ? (
            <EmptyState
              title={t('actions.displayFilterEmpty')}
              description={t('actions.displayFilterEmptyHint')}
              primary={
                <Button onClick={setAllDisplayed} aria-label={t('sources.displayRestoreAll')}>
                  {t('sources.displayRestoreAll')}
                </Button>
              }
              secondary={
                <Link
                  to="/settings/sources"
                  className={cn(
                    'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
                    focusRingClass(),
                  )}
                >
                  {t('nav.sources')}
                </Link>
              }
            />
          ) : null}
          {trulyEmpty ? (
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
          {filterEmpty ? (
            <EmptyState
              title={t('actions.filterEmpty')}
              description={t('actions.filterEmptyHint', { filter: t(`actions.filter.${filter}`) })}
              primary={
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={cn(
                    'inline-flex min-h-10 items-center rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90',
                    focusRingClass(),
                  )}
                >
                  {t('actions.showAll')}
                </button>
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
        </>
      )}
    </div>
  )
}

const stepsStorageKey = (id: number) => `ai-radar:action-steps:${id}`

function loadDoneSteps(id: number): Record<number, boolean> {
  try {
    const raw = localStorage.getItem(stepsStorageKey(id))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, boolean>
    const out: Record<number, boolean> = {}
    for (const [k, v] of Object.entries(parsed)) {
      const n = Number(k)
      if (Number.isFinite(n) && v) out[n] = true
    }
    return out
  } catch {
    return {}
  }
}

function ActionRow({ action }: { action: ActionCard }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const [doneSteps, setDoneSteps] = useState<Record<number, boolean>>(() => loadDoneSteps(action.id))
  useEffect(() => {
    setDoneSteps(loadDoneSteps(action.id))
  }, [action.id])
  useEffect(() => {
    try {
      localStorage.setItem(stepsStorageKey(action.id), JSON.stringify(doneSteps))
    } catch {
      /* ignore quota */
    }
  }, [action.id, doneSteps])
  const patch = useMutation({
    mutationFn: (status: string) => api.patchAction(action.id, { status }),
    onMutate: async (status) => {
      await qc.cancelQueries({ queryKey: ['actions'] })
      const prev = qc.getQueryData<ActionCard[]>(['actions'])
      qc.setQueryData<ActionCard[]>(['actions'], (old) =>
        (old ?? []).map((a) => (a.id === action.id ? { ...a, status } : a)),
      )
      return { prev }
    },
    onSuccess: (_data, status, ctx) => {
      const prevStatus = ctx?.prev?.find((a) => a.id === action.id)?.status
      if (prevStatus && prevStatus !== status) {
        pushToast('success', t('actions.statusUpdated'), {
          label: t('common.undo'),
          onClick: () => {
            void api
              .patchAction(action.id, { status: prevStatus })
              .then(() => {
                if (ctx?.prev) qc.setQueryData(['actions'], ctx.prev)
                void qc.invalidateQueries({ queryKey: ['actions'] })
              })
              .catch(() => undefined)
          },
        })
      } else {
        pushToast('success', t('actions.statusUpdated'))
      }
    },
    onError: (err, _status, ctx) => {
      if (ctx?.prev) qc.setQueryData(['actions'], ctx.prev)
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['actions'] })
    },
  })

  const status = action.status ?? 'open'
  const knownStatus = STATUS_ORDER.includes(status as Filter)
  const statusLabel = knownStatus ? t(`actions.filter.${status}`) : status
  const quickStatuses: Array<{ value: string; labelKey: string }> = [
    { value: 'started', labelKey: 'actions.markStarted' },
    { value: 'watching', labelKey: 'actions.markWatching' },
    { value: 'useful', labelKey: 'actions.markUseful' },
    { value: 'ignored', labelKey: 'actions.markIgnored' },
  ]
  const stepsDone = Object.values(doneSteps).filter(Boolean).length
  const stepsTotal = action.steps?.length ?? 0

  return (
    <li className="border-b border-border/80 py-4 first:pt-0 last:border-0" aria-labelledby={`action-title-${action.id}`}>
      {stepsTotal > 0 ? (
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {t('actions.stepsProgress', { done: stepsDone, total: stepsTotal })}
        </p>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`action-title-${action.id}`} className="text-base font-medium text-ink">
              {action.title}
            </h3>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {t('home.actionMeta', {
              minutes: action.estimatedMinutes ?? 0,
              status: statusLabel,
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
                aria-label={`${t(qs.labelKey)}: ${action.title}`}
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
          {status !== 'open' ? (
            <button
              type="button"
              disabled={patch.isPending}
              aria-label={`${t('actions.markReopen')}: ${action.title}`}
              onClick={() => patch.mutate('open')}
              className={cn(
                'min-h-9 rounded-sm border border-border bg-surface px-2.5 py-1 text-xs text-muted transition hover:border-accent/40 hover:text-ink motion-reduce:transition-none disabled:opacity-40',
                focusRingClass(),
              )}
            >
              {t('actions.markReopen')}
            </button>
          ) : null}
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
            aria-label={`${t('actions.relatedChange')}: ${action.title}`}
            className={`inline-flex min-h-9 items-center ${textLinkClass('moss')}`}
          >
            {t('actions.relatedChange')}
          </Link>
        ) : null}
        {action.newsItemId ? (
          <Link
            to={`/radar?item=${action.newsItemId}`}
            aria-label={`${t('actions.relatedItem')}: ${action.title}`}
            className={`inline-flex min-h-9 items-center ${textLinkClass('moss')}`}
          >
            {t('actions.relatedItem')}
          </Link>
        ) : null}
      </div>
      <FeedbackBar targetType="action" targetId={action.id} invalidateKeys={[['actions']]} />
    </li>
  )
}
