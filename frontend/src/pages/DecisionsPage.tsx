import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCallback, useMemo } from 'react'
import { api, type DecisionRecord } from '../lib/api'
import {
  Button,
  ListSkeleton,
  PageHeader,
  QueryErrorState,
  EmptyState,
  useToast,
} from '../components/ui'
import { useDisplaySources } from '../hooks/useDisplaySources'
import { useEscapeBack } from '../hooks/useEscapeBack'
import { changeMatchesDisplay } from '../lib/sourceFilter'
import { errorText } from '../lib/errors'
import { revisitDayDelta } from '../lib/format'
import { dateLocale } from '../i18n'
import { cn, focusRingClass } from '../lib/cn'

function kindLabel(kind: string, t: (key: string) => string) {
  switch (kind) {
    case 'watch':
      return t('decisions.kindWatch')
    case 'investigate':
      return t('decisions.kindInvestigate')
    case 'adopt':
      return t('decisions.kindAdopt')
    case 'ignore':
      return t('decisions.kindIgnore')
    default:
      return kind
  }
}

function revisitLabel(
  iso: string,
  locale: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  const days = revisitDayDelta(iso)
  if (days == null) return new Date(iso).toLocaleDateString(locale)
  if (days < 0) return t('decisions.revisitOverdue', { count: Math.abs(days) })
  if (days === 0) return t('decisions.revisitToday')
  if (days <= 7) return t('decisions.revisitIn', { count: days })
  return new Date(iso).toLocaleDateString(locale)
}

function DecisionRow({
  d,
  locale,
  emphasize,
  onSnooze,
  snoozing,
}: {
  d: DecisionRecord
  locale: string
  emphasize?: boolean
  onSnooze?: (id: number) => void
  snoozing?: boolean
}) {
  const { t } = useTranslation()
  const title = d.changeTitle ?? t('decisions.untitled')
  const kind = kindLabel(d.kind, t)
  const revisit = d.revisitAt ? revisitLabel(d.revisitAt, locale, t) : null
  const days = d.revisitAt ? revisitDayDelta(d.revisitAt) : null
  const overdue = days != null && days < 0
  const labelParts = [title, kind]
  if (d.reason) labelParts.push(d.reason)
  if (revisit) labelParts.push(revisit)
  return (
    <li>
      <div
        className={cn(
          'px-4 py-3 transition motion-reduce:transition-none',
          emphasize || overdue
            ? 'rounded-xl border border-moss/30 bg-moss/5'
            : 'rounded-lg border border-border bg-surface',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <Link
            to={`/changes/${d.changeId}`}
            state={{ from: '/decisions', focus: 'decision' }}
            aria-label={labelParts.join(' · ')}
            className={cn('min-w-0 flex-1 rounded-sm hover:border-accent/40', focusRingClass())}
          >
            <p className="font-medium text-ink">{title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-md bg-border/70 px-1.5 py-0.5 text-xs font-medium text-ink">
                {kind}
              </span>
              {d.reason ? (
                <span className="line-clamp-2 text-muted">{d.reason}</span>
              ) : null}
            </div>
            {emphasize && (d.updatesSinceDecision ?? 0) > 0 ? (
              <p className="mt-1.5 text-xs text-muted">
                {t('decisions.updatesSince', { count: d.updatesSinceDecision ?? 0 })}
              </p>
            ) : null}
          </Link>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {revisit ? (
              <span
                className={cn(
                  'text-xs tabular-nums',
                  overdue || emphasize ? 'font-medium text-moss' : 'text-muted',
                )}
              >
                {revisit}
              </span>
            ) : null}
            {emphasize && onSnooze ? (
              <Button
                size="sm"
                variant="ghost"
                loading={snoozing}
                disabled={snoozing}
                onClick={() => onSnooze(d.id)}
                aria-label={t('decisions.snoozeAria', { title })}
              >
                {t('decisions.snooze')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  )
}

export default function DecisionsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const locale = dateLocale(i18n.language)
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const { displaySourceIds, noneSelected, setAllDisplayed } = useDisplaySources()
  const q = useQuery({ queryKey: ['decisions'], queryFn: () => api.decisions() })
  const due = useQuery({ queryKey: ['decisions-due'], queryFn: () => api.decisions('due') })

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/')
  }, [navigate])
  useEscapeBack(goBack)

  const dueRows = useMemo(
    () => (due.data ?? []).filter((d) => changeMatchesDisplay(d, displaySourceIds)),
    [due.data, displaySourceIds],
  )
  const openRows = useMemo(() => {
    const dueIds = new Set(dueRows.map((d) => d.id))
    return (q.data ?? [])
      .filter((d) => changeMatchesDisplay(d, displaySourceIds))
      .filter((d) => !dueIds.has(d.id))
  }, [q.data, displaySourceIds, dueRows])

  const snoozeMut = useMutation({
    mutationFn: (id: number) => api.snoozeDecision(id, 7),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['decisions-due'] })
      const prevDue = qc.getQueryData<DecisionRecord[]>(['decisions-due'])
      const removed = prevDue?.find((d) => d.id === id)
      qc.setQueryData<DecisionRecord[]>(['decisions-due'], (old) =>
        (old ?? []).filter((d) => d.id !== id),
      )
      return { prevDue, removed }
    },
    onSuccess: (_data, id, ctx) => {
      const prevRevisit = ctx?.removed?.revisitAt
      if (prevRevisit) {
        pushToast('success', t('decisions.snoozeDone'), {
          label: t('common.undo'),
          onClick: () => {
            void api
              .restoreDecisionRevisit(id, prevRevisit)
              .then(() => {
                if (ctx?.prevDue) qc.setQueryData(['decisions-due'], ctx.prevDue)
                void qc.invalidateQueries({ queryKey: ['decisions'] })
                void qc.invalidateQueries({ queryKey: ['decisions-due'] })
                void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
              })
              .catch(() => undefined)
          },
        })
      } else {
        pushToast('success', t('decisions.snoozeDone'))
      }
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prevDue) qc.setQueryData(['decisions-due'], ctx.prevDue)
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['decisions'] })
      void qc.invalidateQueries({ queryKey: ['decisions-due'] })
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
    },
  })

  return (
    <div aria-busy={q.isFetching || due.isFetching || snoozeMut.isPending || undefined}>
      <PageHeader
        titleId="decisions-page-heading"
        title={t('decisions.title')}
        subtitle={t('decisions.subtitle')}
      />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {t('decisions.summary', { due: dueRows.length, open: openRows.length })}
      </p>

      {noneSelected ? (
        <EmptyState
          title={t('sources.displayNoneActive')}
          description={t('decisions.displayNoneHint')}
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

      {!noneSelected ? (
        <>
          {due.isError ? (
            <div className="mb-6">
              <QueryErrorState
                message={t('common.loadFailed', { message: errorText(due.error, t) })}
                onRetry={() => void due.refetch()}
              />
            </div>
          ) : null}

          {due.isLoading ? (
            <div className="mb-8">
              <ListSkeleton rows={2} />
            </div>
          ) : null}

          {dueRows.length > 0 ? (
            <section className="mb-8" aria-labelledby="decisions-due-heading">
              <h2
                id="decisions-due-heading"
                className="mb-3 font-mono text-xs uppercase tracking-widest text-moss"
              >
                {t('decisions.dueSection')}
              </h2>
              <ul className="space-y-3" aria-busy={due.isFetching || undefined}>
                {dueRows.map((d) => (
                  <DecisionRow
                    key={d.id}
                    d={d}
                    locale={locale}
                    emphasize
                    onSnooze={(id) => snoozeMut.mutate(id)}
                    snoozing={snoozeMut.isPending && snoozeMut.variables === d.id}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {q.isLoading ? <ListSkeleton rows={4} /> : null}
          {q.isError ? (
            <QueryErrorState
              message={t('common.loadFailed', { message: errorText(q.error, t) })}
              onRetry={() => void q.refetch()}
            />
          ) : null}

          <section aria-labelledby="decisions-open-heading">
            <h2
              id="decisions-open-heading"
              className="mb-3 font-mono text-xs uppercase tracking-widest text-muted"
            >
              {t('decisions.openSection')}
            </h2>
            {openRows.length ? (
              <ul className="space-y-2" aria-busy={q.isFetching || undefined}>
                {openRows.map((d) => (
                  <DecisionRow key={d.id} d={d} locale={locale} />
                ))}
              </ul>
            ) : dueRows.length > 0 ? (
              !q.isLoading && (
                <p className="text-sm text-muted">{t('decisions.openEmptyWhileDue')}</p>
              )
            ) : (
              !q.isLoading && !q.isError && (
                <EmptyState
                  title={t('decisions.empty')}
                  description={t('decisions.emptyHint')}
                  primary={
                    <Link
                      to="/"
                      className={cn(
                        'inline-flex min-h-10 items-center rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90',
                        focusRingClass(),
                      )}
                    >
                      {t('decisions.browseToday')}
                    </Link>
                  }
                  secondary={
                    <Link
                      to="/radar"
                      className={cn(
                        'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
                        focusRingClass(),
                      )}
                    >
                      {t('decisions.browseRadar')}
                    </Link>
                  }
                />
              )
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
