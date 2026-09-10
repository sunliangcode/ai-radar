import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
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
  locale,
}: {
  item: Item
  selected?: boolean
  onSelect?: () => void
  onToggleSaved?: () => void
  onMarkRead?: () => void
  locale?: string
}) {
  const { t } = useTranslation()
  const unread = !item.read
  const [expanded, setExpanded] = useState(false)
  const detail = useQuery({
    queryKey: ['item-detail', item.id],
    queryFn: () => api.itemDetail(item.id),
    enabled: expanded,
  })
  const isZhihu = item.primarySourceType === 'ZHIHU'
  return (
    <div
      className={`feed-row group row-py px-3 ${selected ? 'selected' : ''} ${unread ? '' : 'opacity-60'}`}
      onClick={onSelect}
      data-item-id={item.id}
    >
      <div className="flex items-start gap-3">
        <div className="hidden sm:block pt-0.5 w-12 shrink-0">
          <ScoreBar score={item.score} source={item.scoreSource} reason={item.scoreReason} size="sm" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {isZhihu ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded((v) => !v)
                }}
                className="mr-1 inline-block w-4 shrink-0 text-muted hover:text-ink"
                title={t('feed.expand')}
              >
                {expanded ? '▾' : '▸'}
              </button>
            ) : null}
            <a
              href={item.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`font-medium leading-snug hover:underline ${unread ? 'text-ink' : 'text-ink/80'}`}
            >
              {item.title}
            </a>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
            {item.primarySourceType ? (
              <span className="font-mono">{item.primarySourceType}</span>
            ) : null}
            <span className="font-mono tabular-nums">{timeAgo(item.publishedAt ?? item.createdAt, locale)}</span>
            {item.scoreSource && item.scoreSource !== 'unknown' ? (
              <ScoreSourceBadge source={item.scoreSource} />
            ) : null}
            {item.stars != null ? (
              <span className="font-mono">
                ★{item.stars >= 1000 ? `${(item.stars / 1000).toFixed(1)}k` : item.stars}
                {item.starsDelta7d != null && item.starsDelta7d > 0 ? (
                  <span className="text-moss"> +{item.starsDelta7d}·7d</span>
                ) : null}
              </span>
            ) : null}
            {unread ? <span className="h-1.5 w-1.5 rounded-full bg-accent inline-block" title={t('common.unread')} /> : null}
            {item.saved ? <span className="text-moss">★</span> : null}
          </div>
          {item.scoreReason ? (
            <p className="mt-0.5 truncate text-[11px] text-muted/80" title={item.scoreReason}>
              {item.scoreReason}
            </p>
          ) : null}
          <div className="mt-0.5 flex opacity-0 transition group-hover:opacity-100">
            <RowActions item={item} onSaved={onToggleSaved} onRead={onMarkRead} />
          </div>
          {expanded ? (
            <div className="mt-3 rounded-md border border-border bg-surface p-4">
              {detail.isLoading ? (
                <p className="text-xs text-muted">{t('feed.detailLoading')}</p>
              ) : detail.isError ? (
                <p className="text-xs text-ember">
                  {t('feed.detailError')} {(detail.error as Error).message}
                </p>
              ) : detail.data?.kind === 'zhihu' ? (
                <>
                  <div className="mb-2 flex flex-wrap items-baseline gap-x-3 text-xs text-muted">
                    {detail.data.questionTitle ? (
                      <span className="font-medium text-ink">{detail.data.questionTitle}</span>
                    ) : null}
                    {detail.data.author ? (
                      <span>
                        {t('feed.by')} {detail.data.author}
                        {detail.data.authorHeadline ? ` · ${detail.data.authorHeadline}` : ''}
                      </span>
                    ) : null}
                    {detail.data.voteup != null ? (
                      <span className="font-mono">▲{detail.data.voteup}</span>
                    ) : null}
                    {detail.data.commentCount != null ? (
                      <span className="font-mono">💬 {detail.data.commentCount}</span>
                    ) : null}
                  </div>
                  <div
                    className="zhihu-html max-h-[480px] overflow-y-auto text-sm leading-relaxed text-ink"
                    dangerouslySetInnerHTML={{ __html: detail.data.html ?? '' }}
                  />
                  {detail.data.comments && detail.data.comments.length > 0 ? (
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="mb-2 text-xs font-medium text-muted">
                        💬 {detail.data.commentCount} {t('feed.comments')}
                      </p>
                      <ul className="space-y-2">
                        {detail.data.comments.map((c, i) => (
                          <li key={i} className="text-xs leading-relaxed">
                            <span className="font-medium text-ink">{c.author}</span>
                            <span className="text-muted">：{c.content}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : detail.data ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{detail.data.text}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Small toolbar shown on row hover / selection: quick actions. */
export function RowActions({
  item,
  onSaved,
  onRead,
}: {
  item: Item
  onSaved?: () => void
  onRead?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-1 text-[11px]">
      <button onClick={onSaved} className="rounded px-1.5 py-0.5 hover:bg-mist/60 text-muted hover:text-ink">
        {item.saved ? t('feed.unsave') : t('feed.save')}
      </button>
      {!item.read ? (
        <button onClick={onRead} className="rounded px-1.5 py-0.5 hover:bg-mist/60 text-muted hover:text-ink">
          {t('feed.read')}
        </button>
      ) : null}
      <a
        href={item.canonicalUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded px-1.5 py-0.5 hover:bg-mist/60 text-muted hover:text-ink"
      >
        {t('feed.open')} ↗
      </a>
    </div>
  )
}
