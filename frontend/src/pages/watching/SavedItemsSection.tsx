import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Item } from '../../lib/api'
import {
  EmptyState,
  ImmersiveDrawer,
  ItemDetailBody,
  ListSkeleton,
  MagAction,
  MagCard,
  MagGrid,
  QueryErrorState,
  SourceBadge,
} from '../../components/ui'
import { timeAgo } from '../../components/magazine/timeAgo'
import { errorText } from '../../lib/errors'
import { cn, focusRingClass } from '../../lib/cn'

function scoreTier(score?: number): string | undefined {
  if (score == null) return undefined
  if (score >= 80) return 'HIGH'
  if (score >= 50) return 'MEDIUM'
  return 'LOW'
}

export function SavedItemsSection({
  items,
  loading,
  error,
  locale,
  patchPending,
  onRetry,
  onMarkRead,
  onUnsave,
}: {
  items: Item[]
  loading: boolean
  error: unknown
  locale: string
  patchPending: boolean
  onRetry: () => void
  onMarkRead: (id: number) => void
  onUnsave: (id: number) => void
  /** @deprecated Card click opens href + marks read via onMarkRead. */
  onOpenExternal?: (item: Item) => void
}) {
  const { t } = useTranslation()
  const [drawerId, setDrawerId] = useState<number | null>(null)
  const drawerItem = items.find((i) => i.id === drawerId) ?? null

  return (
    <section aria-labelledby="watching-saved-heading" aria-busy={patchPending || undefined}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="watching-saved-heading" className="text-base font-semibold text-ink">
          {t('watching.savedItems')}
        </h2>
        <span className="font-mono text-xs text-muted" aria-live="polite">
          {t('watching.savedCount', { count: items.length })}
        </span>
      </div>
      {loading ? <ListSkeleton rows={3} /> : null}
      {error ? (
        <QueryErrorState
          message={t('common.loadFailed', { message: errorText(error, t) })}
          onRetry={onRetry}
        />
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title={t('watching.noSaved')}
          description={t('watching.noSavedHint')}
          primary={
            <Link
              to="/radar"
              className={cn(
                'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
                focusRingClass(),
              )}
            >
              {t('watching.goRadar')}
            </Link>
          }
        />
      ) : null}
      {!error && items.length > 0 ? (
        <MagGrid dimmed={drawerId != null} aria-label={t('watching.savedItems')}>
          {items.map((item) => (
            <MagCard
              key={item.id}
              dataId={item.id}
              title={item.titleDisplay || item.title}
              lead={item.summary || item.scoreReason}
              score={item.score}
              tier={scoreTier(item.score)}
              sourceType={item.primarySourceType}
              tags={item.tags}
              unread={!item.read}
              selected={item.id === drawerId}
              dimmed={drawerId != null && item.id !== drawerId}
              href={item.canonicalUrl}
              onOpen={() => {
                if (!item.read) onMarkRead(item.id)
              }}
              meta={
                <>
                  {item.publishedAt ? (
                    <span className="tabular-nums">{timeAgo(item.publishedAt, locale)}</span>
                  ) : null}
                  {item.read ? <span>{t('watching.readBadge')}</span> : null}
                </>
              }
              actions={
                <MagAction
                  disabled={patchPending}
                  onClick={() => onUnsave(item.id)}
                  tone="ember"
                  title={t('watching.unsave')}
                >
                  {t('watching.unsave')}
                </MagAction>
              }
              secondaryActions={
                <>
                  <MagAction onClick={() => setDrawerId(item.id)}>{t('feed.expand')}</MagAction>
                  {!item.read ? (
                    <MagAction onClick={() => onMarkRead(item.id)}>{t('common.markRead')}</MagAction>
                  ) : null}
                </>
              }
            />
          ))}
        </MagGrid>
      ) : null}

      <ImmersiveDrawer
        open={!!drawerItem}
        onClose={() => setDrawerId(null)}
        title={drawerItem ? drawerItem.titleDisplay || drawerItem.title : undefined}
        titleHref={drawerItem?.canonicalUrl}
        onTitleNavigate={() => {
          if (drawerItem && !drawerItem.read) onMarkRead(drawerItem.id)
        }}
        subtitle={
          drawerItem ? (
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge type={drawerItem.primarySourceType} />
              {drawerItem.publishedAt ? (
                <span className="tabular-nums">{timeAgo(drawerItem.publishedAt, locale)}</span>
              ) : null}
            </div>
          ) : null
        }
        headerAction={
          drawerItem?.canonicalUrl ? (
            <a
              href={drawerItem.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                if (!drawerItem.read) onMarkRead(drawerItem.id)
              }}
              className={cn(
                'inline-flex min-h-9 items-center rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90',
                focusRingClass('none'),
              )}
            >
              {t('feed.openOriginal')} ↗
            </a>
          ) : null
        }
        footer={
          drawerItem ? (
            <div className="flex flex-wrap gap-1">
              {!drawerItem.read ? (
                <MagAction onClick={() => onMarkRead(drawerItem.id)}>{t('common.markRead')}</MagAction>
              ) : null}
              <MagAction
                disabled={patchPending}
                onClick={() => {
                  onUnsave(drawerItem.id)
                  setDrawerId(null)
                }}
                tone="ember"
              >
                {t('watching.unsave')}
              </MagAction>
              <MagAction
                href={drawerItem.canonicalUrl}
                onClick={() => {
                  if (!drawerItem.read) onMarkRead(drawerItem.id)
                }}
                tone="accent"
              >
                {t('feed.openOriginal')} ↗
              </MagAction>
            </div>
          ) : null
        }
      >
        {drawerItem ? (
          <ItemDetailBody itemId={drawerItem.id} lead={drawerItem.summary} />
        ) : null}
      </ImmersiveDrawer>
    </section>
  )
}
