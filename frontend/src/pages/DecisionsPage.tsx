import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { ListSkeleton, PageHeader, StateBox } from '../components/ui'
import { errorText } from '../lib/errors'
import { dateLocale } from '../i18n'

export default function DecisionsPage() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const q = useQuery({ queryKey: ['decisions'], queryFn: () => api.decisions() })
  const due = useQuery({ queryKey: ['decisions-due'], queryFn: () => api.decisions('due') })

  return (
    <div>
      <PageHeader title={t('decisions.title')} subtitle={t('decisions.subtitle')} />
      {(due.data?.length ?? 0) > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-moss">{t('decisions.dueSection')}</h2>
          <ul className="space-y-3">
            {due.data!.map((d) => (
              <li key={d.id} className="rounded-xl border border-moss/30 bg-moss/5 px-4 py-3">
                <p className="font-medium text-ink">{d.changeTitle}</p>
                <p className="mt-1 text-sm text-muted">{d.reason}</p>
                <p className="mt-2 text-xs text-muted">
                  {t('decisions.updatesSince', { count: d.updatesSinceDecision ?? 0 })}
                </p>
                <Link to={`/changes/${d.changeId}`} className="mt-2 inline-block text-sm text-moss hover:underline">
                  {t('today.openChange')} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {q.isLoading ? <ListSkeleton rows={4} /> : null}
      {q.isError ? <StateBox>{t('common.loadFailed', { message: errorText(q.error, t) })}</StateBox> : null}

      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">{t('decisions.openSection')}</h2>
      {q.data?.length ? (
        <ul className="space-y-2">
          {q.data.map((d) => (
            <li key={d.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <span className="font-mono text-xs uppercase text-faint">{d.kind}</span>
              <Link to={`/changes/${d.changeId}`} className="ml-2 font-medium text-accent hover:underline">
                {d.changeTitle}
              </Link>
              {d.revisitAt ? (
                <span className="ml-2 text-xs text-muted">
                  {new Date(d.revisitAt).toLocaleDateString(locale)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        !q.isLoading && <StateBox>{t('decisions.empty')}</StateBox>
      )}
    </div>
  )
}
