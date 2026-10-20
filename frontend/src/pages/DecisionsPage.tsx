import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCallback, useMemo } from 'react'
import { api, type DecisionRecord } from '../lib/api'
import { ListSkeleton, PageHeader, QueryErrorState, EmptyState } from '../components/ui'
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
}: {
  d: DecisionRecord
  locale: string
  emphasize?: boolean
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
      <Link
        to={`/changes/${d.changeId}`}
        state={{ from: '/decisions', focus: 'decision' }}
        aria-label={labelParts.join(' · ')}
        className={cn(
          'block px-4 py-3 transition motion-reduce:transition-none hover:border-accent/40',
          focusRingClass(),
          emphasize || overdue
            ? 'rounded-xl border border-moss/30 bg-moss/5'
            : 'rounded-lg border border-border bg-surface',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
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
          </div>
          {revisit ? (
            <span
              className={cn(
                'shrink-0 text-xs tabular-nums',
                overdue || emphasize ? 'font-medium text-moss' : 'text-muted',
              )}
            >
              {revisit}
            </span>
          ) : null}
        </div>
      </Link>
    </li>
  )
}

export default function DecisionsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const locale = dateLocale(i18n.language)
  const { displaySourceIds } = useDisplaySources()
  const q = useQuery({ queryKey: ['decisions'], queryFn: () => api.decisions() })
  const due = useQuery({ queryKey: ['decisions-due'], queryFn: () => api.decisions('due') })

  const goBack = useCallback(() => {
    navigate('/')
  }, [navigate])
  useEscapeBack(goBack)

  const dueRows = useMemo(
    () => (due.data ?? []).filter((d) => changeMatchesDisplay(d, displaySourceIds)),
    [due.data, displaySourceIds],
  )
  const openRows = useMemo(
    () => (q.data ?? []).filter((d) => changeMatchesDisplay(d, displaySourceIds)),
    [q.data, displaySourceIds],
  )

  return (
    <div aria-busy={q.isFetching || due.isFetching || undefined}>
      <PageHeader
        titleId="decisions-page-heading"
        title={t('decisions.title')}
        subtitle={t('decisions.subtitle')}
      />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {t('decisions.summary', { due: dueRows.length, open: openRows.length })}
      </p>

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
              <DecisionRow key={d.id} d={d} locale={locale} emphasize />
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
        ) : (
          !q.isLoading && (
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
    </div>
  )
}
