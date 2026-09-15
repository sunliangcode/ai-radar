import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Item } from '../../lib/api'
import {
  Button,
  EmptyState,
  ImmersiveDrawer,
  ItemDetailBody,
  ListSkeleton,
  MagAction,
  MagCard,
  MagGrid,
  SourceBadge,
  StateBox,
} from '../../components/ui'
import { timeAgo } from '../../components/magazine/timeAgo'
import { errorText } from '../../lib/errors'

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
  const [drawerId, setDrawerId] = useState<number | null>(null)
  const drawerItem = items.find((i) => i.id === drawerId) ?? null

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
        <MagGrid dimmed={drawerId != null}>
          {items.map((item) => (
            <MagCard
              key={item.id}
              dataId={item.id}
              title={item.titleDisplay || item.title}
              lead={item.summary || item.scoreReason}
              score={item.score}
              tier={scoreTier(item.score)}
              unread={!item.read}
              selected={item.id === drawerId}
              dimmed={drawerId != null && item.id !== drawerId}
              onOpen={() => setDrawerId(item.id)}
              meta={
                <>
                  <SourceBadge type={item.primarySourceType} />
                  {item.publishedAt ? (
                    <span className="tabular-nums">{timeAgo(item.publishedAt, locale)}</span>
                  ) : null}
                  {item.read ? <span>{t('watching.readBadge')}</span> : null}
                </>
              }
              actions={
                <>
                  {!item.read ? (
                    <MagAction onClick={() => onMarkRead(item.id)}>{t('common.markRead')}</MagAction>
                  ) : null}
                  <MagAction
                    disabled={patchPending}
                    onClick={() => onUnsave(item.id)}
                    tone="ember"
                  >
                    {t('watching.unsave')}
                  </MagAction>
                  <MagAction
                    href={item.canonicalUrl}
                    onClick={() => onOpenExternal(item)}
                  >
                    {t('feed.open')} ↗
                  </MagAction>
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
                onClick={() => onOpenExternal(drawerItem)}
              >
                {t('feed.open')} ↗
              </MagAction>
            </div>
          ) : null
        }
      >
        {drawerItem ? (
          <>
            {drawerItem.summary ? (
              <p className="mb-4 text-sm leading-relaxed text-ink/90">{drawerItem.summary}</p>
            ) : null}
            <ItemDetailBody itemId={drawerItem.id} />
          </>
        ) : null}
      </ImmersiveDrawer>
    </section>
  )
}
