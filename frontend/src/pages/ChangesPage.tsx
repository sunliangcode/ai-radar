import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { ListSkeleton, PageHeader, QueryErrorState, EmptyState, StatusBadge } from '../components/ui'
import { useDisplaySources } from '../hooks/useDisplaySources'
import { changeMatchesDisplay } from '../lib/sourceFilter'
import { errorText } from '../lib/errors'
import { cn, focusRingClass } from '../lib/cn'

export default function ChangesPage() {
  const { t } = useTranslation()
  const { displaySourceIds } = useDisplaySources()
  const q = useQuery({ queryKey: ['changes-list'], queryFn: () => api.changes(50) })
  const rows = (q.data ?? []).filter((c) => changeMatchesDisplay(c, displaySourceIds))

  return (
    <div>
      <PageHeader title={t('changes.listTitle')} subtitle={t('changes.listSubtitle')} />
      {q.isLoading ? <ListSkeleton rows={6} /> : null}
      {q.isError ? (
        <QueryErrorState
          message={t('common.loadFailed', { message: errorText(q.error, t) })}
          onRetry={() => void q.refetch()}
        />
      ) : null}
      {rows.length ? (
        <ul className="space-y-3" aria-label={t('changes.listTitle')} aria-busy={q.isFetching || undefined}>
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                to={`/changes/${c.id}`}
                aria-label={c.title}
                className={cn(
                  'block rounded-xl border border-border bg-surface px-4 py-3 transition motion-reduce:transition-none hover:border-accent/40',
                  focusRingClass(),
                )}
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
      {!q.isLoading && !q.isError && !rows.length ? (
        <EmptyState
          title={t('changes.empty')}
          description={t('changes.emptyHint')}
          primary={
            <Link
              to="/settings/context"
              className={cn(
                'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
                focusRingClass(),
              )}
            >
              {t('changes.emptyCta')}
            </Link>
          }
          secondary={
            <Link
              to="/radar"
              className={cn(
                'inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-ink',
                focusRingClass(),
              )}
            >
              {t('nav.radar')}
            </Link>
          }
        />
      ) : null}
    </div>
  )
}
