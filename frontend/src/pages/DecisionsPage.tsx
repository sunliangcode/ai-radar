import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { api, type DecisionRecord } from '../lib/api'
import { ListSkeleton, PageHeader, StateBox } from '../components/ui'
import { useDisplaySources } from '../hooks/useDisplaySources'
import { changeMatchesDisplay } from '../lib/sourceFilter'
import { errorText } from '../lib/errors'
import { dateLocale } from '../i18n'

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
    <li
      className={
        emphasize
          ? 'rounded-xl border border-moss/30 bg-moss/5 px-4 py-3'
          : 'rounded-lg border border-border px-4 py-3'
      }
    >
      <p className="font-medium text-ink">{d.changeTitle ?? t('decisions.untitled')}</p>
      <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[5rem_1fr]">
        <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">{t('decisions.fieldDecision')}</dt>
        <dd className="text-ink">{kindLabel(d.kind, t)}</dd>
        {d.reason ? (
          <>
            <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">{t('decisions.fieldWhy')}</dt>
            <dd className="text-muted">{d.reason}</dd>
          </>
        ) : null}
        {d.revisitAt ? (
          <>
            <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">{t('decisions.fieldReview')}</dt>
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
      <Link
        to={`/changes/${d.changeId}`}
        state={{ from: '/decisions' }}
        className={`mt-2 inline-block text-sm hover:underline ${emphasize ? 'text-moss' : 'text-accent'}`}
      >
        {t('decisions.relatedChange')} →
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
    <div>
      <PageHeader title={t('decisions.title')} subtitle={t('decisions.subtitle')} />
      {dueRows.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-moss">
            {t('decisions.dueSection')}
          </h2>
          <ul className="space-y-3">
            {dueRows.map((d) => (
              <DecisionRow key={d.id} d={d} locale={locale} emphasize />
            ))}
          </ul>
        </section>
      ) : null}

      {q.isLoading ? <ListSkeleton rows={4} /> : null}
      {q.isError ? <StateBox>{t('common.loadFailed', { message: errorText(q.error, t) })}</StateBox> : null}

      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
        {t('decisions.openSection')}
      </h2>
      {openRows.length ? (
        <ul className="space-y-2">
          {openRows.map((d) => (
            <DecisionRow key={d.id} d={d} locale={locale} />
          ))}
        </ul>
      ) : (
        !q.isLoading && <StateBox>{t('decisions.empty')}</StateBox>
      )}
    </div>
  )
}
