import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { ListSkeleton, PageHeader, StateBox, StatusBadge } from '../components/ui'
import { errorText } from '../lib/errors'

export default function ChangesPage() {
  const { t } = useTranslation()
  const q = useQuery({ queryKey: ['changes-list'], queryFn: () => api.changes(50) })

  return (
    <div>
      <PageHeader title={t('changes.listTitle')} subtitle={t('changes.listSubtitle')} />
      {q.isLoading ? <ListSkeleton rows={6} /> : null}
      {q.isError ? <StateBox>{t('common.loadFailed', { message: errorText(q.error, t) })}</StateBox> : null}
      {q.data?.length ? (
        <ul className="space-y-3">
          {q.data.map((c) => (
            <li key={c.id}>
              <Link
                to={`/changes/${c.id}`}
                className="block rounded-xl border border-border bg-surface px-4 py-3 transition hover:border-accent/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{c.title}</span>
                  {c.tier ? <StatusBadge status={c.tier} /> : null}
                </div>
                {c.summary ? <p className="mt-1 text-sm text-muted line-clamp-2">{c.summary}</p> : null}
                {c.lastUpdatedAt ? (
                  <p className="mt-2 font-mono text-[10px] text-faint">{c.lastUpdatedAt}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {!q.isLoading && !q.isError && !q.data?.length ? <StateBox>{t('changes.empty')}</StateBox> : null}
    </div>
  )
}
