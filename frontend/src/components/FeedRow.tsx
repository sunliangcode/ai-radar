import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type Item } from '../lib/api'
import { ScoreBar, ScoreSourceBadge } from './ui'

function timeAgo(iso?: string, locale?: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  return new Date(iso).toLocaleDateString(locale)
}

export function FeedRow({
  item,
  selected,
  onSelect,
  onToggleSaved,
  onMarkRead,
  onNotInterested,
  onOpenExternal,
  locale,
  expandSignal,
}: {
  item: Item
  selected?: boolean
  onSelect?: () => void
  onToggleSaved?: () => void
  onMarkRead?: () => void
  onNotInterested?: () => void
  /** Called when the user opens the original link (href still navigates). */
  onOpenExternal?: () => void
  locale?: string
  /** When provided, toggling this value (e.g. keyboard "o") expands/collapses the row. */
  expandSignal?: number
}) {
  const { t } = useTranslation()
  const unread = !item.read
  const [expanded, setExpanded] = useState(false)
  const [showAllComments, setShowAllComments] = useState(false)
  const detailRef = useRef<HTMLDivElement>(null)
  const detail = useQuery({
    queryKey: ['item-detail', item.id],
    queryFn: () => api.itemDetail(item.id),
    enabled: expanded,
  })

  // External expand signal (keyboard "o")
  useEffect(() => {
    if (expandSignal != null) {
      setExpanded((v) => !v)
    }
  }, [expandSignal])

  // Keep the row in view when expanding, but don't re-scroll after detail loads
  // (async Zhihu content would otherwise yank the viewport).
  useEffect(() => {
    if (expanded && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on expand toggle
  }, [expanded])

  const comments = detail.data?.comments ?? []
  const visibleComments = showAllComments ? comments : comments.slice(0, 3)

  return (
    <div
      className={`feed-row row-py px-4 ${selected ? 'selected' : ''} ${unread ? '' : 'opacity-55'}`}
      onClick={onSelect}
      data-item-id={item.id}
    >
      <div className="flex items-start gap-3">
        <div className="hidden sm:block pt-1 w-10 shrink-0">
          <ScoreBar score={item.score} source={item.scoreSource} reason={item.scoreReason} size="sm" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded((v) => !v)
              }}
              className={`shrink-0 w-4 text-xs transition-transform ${expanded ? 'rotate-90 text-accent' : 'text-faint'}`}
              title={t('feed.expand')}
              aria-expanded={expanded}
              aria-label={t('feed.expand')}
            >
              ▶
            </button>
            <a
              href={item.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                e.stopPropagation()
                onOpenExternal?.()
              }}
              className={`text-[15px] leading-snug font-medium hover:text-accent hover:underline underline-offset-2 decoration-accent/40 ${unread ? 'text-ink' : 'text-ink/70'}`}
            >
              {item.titleDisplay || item.title}
            </a>
          </div>
          {item.titleDisplay && item.titleDisplay !== item.title ? (
            <p className="mt-0.5 pl-5 text-[11px] text-faint line-clamp-1" title={item.title}>
              {item.title}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted">
            <SourceBadge type={item.primarySourceType} />
            <span className="tabular-nums">{timeAgo(item.publishedAt ?? item.createdAt, locale)}</span>
            {item.scoreSource && item.scoreSource !== 'unknown' ? (
              <ScoreSourceBadge source={item.scoreSource} />
            ) : null}
            {item.stars != null ? (
              <span>
                ★{item.stars >= 1000 ? `${(item.stars / 1000).toFixed(1)}k` : item.stars}
                {item.starsDelta7d != null && item.starsDelta7d > 0 ? (
                  <span className="text-moss"> +{item.starsDelta7d}</span>
                ) : null}
              </span>
            ) : null}
            {unread ? <span className="h-1.5 w-1.5 rounded-full bg-accent inline-block" /> : null}
            {item.saved ? <span className="text-moss">★</span> : null}
          </div>
          {item.summary ? (
            <p className="mt-1.5 pl-5 text-[13px] leading-snug text-ink/80 line-clamp-2" title={item.summary}>
              {item.summary}
            </p>
          ) : item.scoreReason ? (
            <p className="mt-1 pl-5 line-clamp-1 text-xs text-faint" title={item.scoreReason}>
              {item.scoreReason}
            </p>
          ) : null}
          <div
            className={`mt-1 flex items-center gap-1 transition ${
              selected ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
            }`}
          >
            <RowActions
              item={item}
              onSaved={onToggleSaved}
              onRead={onMarkRead}
              onNotInterested={onNotInterested}
              onOpenExternal={onOpenExternal}
            />
          </div>
        </div>
      </div>

      {expanded ? (
        <div ref={detailRef} className="feed-row-detail mt-2 px-5 py-4 -mx-4">
          {detail.isLoading ? (
            <div className="space-y-2">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
              <div className="skeleton h-4 w-4/6" />
            </div>
          ) : detail.isError ? (
            <p className="text-xs text-ember">
              {t('feed.detailError')} {(detail.error as Error).message}
            </p>
          ) : detail.data?.kind === 'zhihu' ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                {detail.data.author ? (
                  <span className="flex items-center gap-1.5">
                    <span className="font-medium text-ink">{detail.data.author}</span>
                    {detail.data.authorHeadline ? (
                      <span className="text-faint">· {detail.data.authorHeadline}</span>
                    ) : null}
                  </span>
                ) : null}
                {detail.data.voteup != null && detail.data.voteup > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-accent-soft px-2 py-0.5 text-accent font-medium">
                        ▲ {detail.data.voteup}
                  </span>
                ) : null}
                {detail.data.commentCount != null && detail.data.commentCount > 0 ? (
                  <span className="text-faint">💬 {detail.data.commentCount}</span>
                ) : null}
              </div>
              <div
                className="zhihu-html max-h-[420px] overflow-y-auto pr-1 text-sm leading-[1.75]"
                dangerouslySetInnerHTML={{ __html: detail.data.html ?? '' }}
              />
              {comments.length > 0 ? (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-2 text-xs font-medium text-muted">
                    {t('feed.commentsTitle', { count: comments.length })}
                  </p>
                  <ul className="space-y-2.5">
                    {visibleComments.map((c, i) => (
                      <li key={i} className="text-xs leading-relaxed">
                        <span className="font-medium text-ink">{c.author}</span>
                        <span className="text-muted">：{c.content}</span>
                      </li>
                    ))}
                  </ul>
                  {comments.length > 3 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowAllComments((v) => !v)
                      }}
                      className="mt-2 text-xs text-accent hover:underline"
                    >
                      {showAllComments
                        ? t('feed.collapseComments')
                        : t('feed.expandComments', { count: comments.length - 3 })}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : detail.data ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{detail.data.text}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function SourceBadge({ type }: { type?: string }) {
  if (!type) return null
  const colors: Record<string, string> = {
    ZHIHU: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    GITHUB: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    HACKER_NEWS: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    REDDIT: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }
  const cls = colors[type] ?? 'bg-mist text-muted'
  return (
    <span className={`rounded px-1.5 py-px text-[10px] font-mono ${cls}`}>{type}</span>
  )
}

/** Small toolbar shown on row hover / selection: quick actions. */
export function RowActions({
  item,
  onSaved,
  onRead,
  onNotInterested,
  onOpenExternal,
}: {
  item: Item
  onSaved?: () => void
  onRead?: () => void
  onNotInterested?: () => void
  onOpenExternal?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-0.5 text-xs">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSaved?.()
        }}
        className="rounded px-1.5 py-0.5 hover:bg-mist text-muted hover:text-ink"
      >
        {item.saved ? t('feed.unsave') : t('feed.save')}
      </button>
      {!item.read ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRead?.()
          }}
          className="rounded px-1.5 py-0.5 hover:bg-mist text-muted hover:text-ink"
        >
          {t('feed.read')}
        </button>
      ) : null}
      {onNotInterested ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onNotInterested()
          }}
          className="rounded px-1.5 py-0.5 hover:bg-mist text-muted hover:text-ember"
        >
          {t('feed.notInterested')}
        </button>
      ) : null}
      <a
        href={item.canonicalUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => {
          e.stopPropagation()
          onOpenExternal?.()
        }}
        className="rounded px-1.5 py-0.5 hover:bg-mist text-muted hover:text-ink"
      >
        {t('feed.open')} ↗
      </a>
    </div>
  )
}
