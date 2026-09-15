import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { EmptyState, ListSkeleton, PageHeader, StateBox } from '../components/ui'
import { errorText } from '../lib/errors'
import { dateLocale } from '../i18n'

/**
 * Index of generated daily briefs.
 *
 * `/briefs/:date` existed but nothing linked to it, so the whole digest feature was only reachable
 * by typing a URL. This page makes it discoverable from the sidebar.
 */
export default function BriefsPage() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const briefs = useQuery({ queryKey: ['briefs'], queryFn: api.briefs })

  const list = briefs.data ?? []

  return (
    <div>
      <PageHeader title={t('briefs.title')} subtitle={t('briefs.subtitle')} />

      {briefs.isLoading ? <ListSkeleton rows={5} /> : null}
      {briefs.isError ? (
        <StateBox>
          <p className="mb-3">{t('common.loadFailed', { message: errorText(briefs.error, t) })}</p>
        </StateBox>
      ) : null}
      {!briefs.isLoading && !briefs.isError && list.length === 0 ? (
        <EmptyState title={t('briefs.emptyTitle')} description={t('briefs.emptyDescription')} />
      ) : null}

      {list.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {list.map((b) => (
            <li key={b.date} className="row-py px-4">
              <Link to={`/briefs/${b.date}`} className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm text-ink">
                  {new Date(`${b.date}T00:00:00`).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </span>
                <span className="text-xs text-muted">{b.date}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
