import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Item } from '../../lib/api'
import { Button, EmptyState, ListSkeleton, ScoreBar, StateBox } from '../../components/ui'
import { errorText } from '../../lib/errors'

export function SavedItemsSection({
  items,
  loading,
  error,
  locale,
  patchPending,
  onRetry,
  onMarkRead,
  onUnsave,
  onOpenExternal,
}: {
  items: Item[]
  loading: boolean
  error: unknown
  locale: string
  patchPending: boolean
  onRetry: () => void
  onMarkRead: (id: number) => void
  onUnsave: (id: number) => void
  onOpenExternal: (item: Item) => void
}) {
  const { t } = useTranslation()

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink">{t('watching.savedItems')}</h2>
        <span className="font-mono text-xs text-muted">
          {t('watching.savedCount', { count: items.length })}
        </span>
      </div>
      {loading ? <ListSkeleton rows={3} /> : null}
      {error ? (
        <StateBox>
          <p className="mb-3">{t('common.loadFailed', { message: errorText(error, t) })}</p>
          <Button variant="ghost" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </StateBox>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title={t('watching.noSaved')}
          description={t('watching.noSavedHint')}
          primary={
            <Link to="/feed">
              <Button>{t('watching.goFeed')}</Button>
            </Link>
          }
        />
      ) : null}
      {!error && items.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {items.map((item) => (
            <li key={item.id} className="row-py px-4">
              <div className="flex items-start gap-3">
                <div className="pt-0.5 w-12 shrink-0">
                  <ScoreBar
                    score={item.score}
                    source={item.scoreSource}
                    reason={item.scoreReason}
                    size="sm"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <a
                    href={item.canonicalUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onOpenExternal(item)}
                    className="font-medium text-ink hover:underline"
                  >
                    {item.title}
                  </a>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    {item.primarySourceType ? (
                      <span className="font-mono">{item.primarySourceType}</span>
                    ) : null}
                    {item.publishedAt ? (
                      <span className="font-mono tabular-nums">
                        {new Date(item.publishedAt).toLocaleDateString(locale)}
                      </span>
                    ) : null}
                    {item.read ? <span className="font-mono">{t('watching.readBadge')}</span> : null}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {!item.read ? (
                      <button
                        type="button"
                        onClick={() => onMarkRead(item.id)}
                        className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-border hover:text-ink"
                      >
                        {t('common.markRead')}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={patchPending}
                      onClick={() => onUnsave(item.id)}
                      className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-border hover:text-ink disabled:opacity-50"
                    >
                      {t('watching.unsave')}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
