import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { api, type DecisionRecord } from '../lib/api'
import { ListSkeleton, PageHeader, QueryErrorState, EmptyState } from '../components/ui'
import { useDisplaySources } from '../hooks/useDisplaySources'
import { changeMatchesDisplay } from '../lib/sourceFilter'
import { errorText } from '../lib/errors'
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
  return (
    <li>
      <Link
        to={`/changes/${d.changeId}`}
        state={{ from: '/decisions' }}
        aria-label={`${d.changeTitle ?? t('decisions.untitled')} — ${kindLabel(d.kind, t)}`}
        className={cn(
          'block px-4 py-3 transition motion-reduce:transition-none hover:border-accent/40',
          focusRingClass(),
          emphasize
            ? 'rounded-xl border border-moss/30 bg-moss/5'
            : 'rounded-lg border border-border bg-surface',
        )}
      >
        <p className="font-medium text-ink">{d.changeTitle ?? t('decisions.untitled')}</p>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[5rem_1fr]">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">
            {t('decisions.fieldDecision')}
          </dt>
          <dd className="text-ink">{kindLabel(d.kind, t)}</dd>
          {d.reason ? (
            <>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">
                {t('decisions.fieldWhy')}
              </dt>
              <dd className="text-muted">{d.reason}</dd>
            </>
          ) : null}
          {d.revisitAt ? (
            <>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">
                {t('decisions.fieldReview')}
              </dt>
              <dd className={emphasize ? 'text-moss' : 'text-muted'}>
                {new Date(d.revisitAt).toLocaleDateString(locale)}
              </dd>
            </>
          ) : null}
        </dl>
        {emphasize && (d.updatesSinceDecision ?? 0) > 0 ? (
          <p className="mt-2 text-xs text-muted">
            {t('decisions.updatesSince', { count: d.updatesSinceDecision ?? 0 })}
          </p>
        ) : null}
        <span
          className={cn(
            'mt-2 inline-block text-sm',
            emphasize ? 'text-moss' : 'text-accent',
          )}
        >
          {t('decisions.relatedChange')} →
        </span>
      </Link>
    </li>
  )
}

export default function DecisionsPage() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const { displaySourceIds } = useDisplaySources()
  const q = useQuery({ queryKey: ['decisions'], queryFn: () => api.decisions() })
  const due = useQuery({ queryKey: ['decisions-due'], queryFn: () => api.decisions('due') })

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
      <PageHeader title={t('decisions.title')} subtitle={t('decisions.subtitle')} />

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
