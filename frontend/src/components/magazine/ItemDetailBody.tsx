import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { errorText } from '../../lib/errors'
import { cn, textLinkClass } from '../../lib/cn'
import { Button } from '../ui'

/** Lazy-loaded item body for the immersive drawer (Zhihu HTML or plain text). */
export function ItemDetailBody({
  itemId,
  lead,
}: {
  itemId: number
  /** Optional AI summary shown once above the body (skipped when body repeats it). */
  lead?: string | null
}) {
  const { t } = useTranslation()
  const [showAllComments, setShowAllComments] = useState(false)
  const detail = useQuery({
    queryKey: ['item-detail', itemId],
    queryFn: () => api.itemDetail(itemId),
  })

  if (detail.isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-live="polite">
        <span className="sr-only">{t('common.loading')}</span>
        {lead ? <p className="mb-2 text-sm leading-relaxed text-ink/90">{lead}</p> : null}
        <div className="skeleton h-4 w-2/3" aria-hidden />
        <div className="skeleton h-4 w-full" aria-hidden />
        <div className="skeleton h-4 w-5/6" aria-hidden />
        <div className="skeleton h-4 w-4/6" aria-hidden />
      </div>
    )
  }

  if (detail.isError) {
    return (
      <>
        {lead ? <p className="mb-4 text-sm leading-relaxed text-ink/90">{lead}</p> : null}
        <div role="alert" className="rounded-lg border border-dashed border-border bg-surface px-3 py-4">
          <p className="text-xs text-ember">
            {t('feed.detailError')} {errorText(detail.error, t)}
          </p>
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => void detail.refetch()}
          >
            {t('common.retry')}
          </Button>
        </div>
      </>
    )
  }

  const data = detail.data
  if (!data) return null

  const comments = data.comments ?? []
  const visibleComments = showAllComments ? comments : comments.slice(0, 3)
  const bodyText = data.kind === 'plain' ? (data.text ?? '').trim() : ''
  const leadText = (lead ?? '').trim()
  const showLead = Boolean(leadText) && leadText !== bodyText

  if (data.kind === 'zhihu') {
    return (
      <>
        {showLead ? <p className="mb-4 text-sm leading-relaxed text-ink/90">{leadText}</p> : null}
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {data.author ? (
            <span className="flex items-center gap-1.5">
              <span className="font-medium text-ink">{data.author}</span>
              {data.authorHeadline ? (
                <span className="text-faint">· {data.authorHeadline}</span>
              ) : null}
            </span>
          ) : null}
          {data.voteup != null && data.voteup > 0 ? (
            <span className="inline-flex items-center rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
              ▲ {data.voteup}
            </span>
          ) : null}
          {data.commentCount != null && data.commentCount > 0 ? (
            <span className="text-faint">
              {data.commentCount} {t('feed.comments')}
            </span>
          ) : null}
        </div>
        <div
          className="zhihu-html max-h-[min(60vh,520px)] overflow-y-auto pr-1 text-sm leading-[1.75]"
          role="region"
          aria-label={t('feed.readInRadar')}
          dangerouslySetInnerHTML={{ __html: data.html ?? '' }}
        />
        {comments.length > 0 ? (
          <div className="mt-4 border-t border-border pt-3">
            <p id="item-detail-comments-heading" className="mb-2 text-xs font-medium text-muted">
              {t('feed.commentsTitle', { count: comments.length })}
            </p>
            <ul
              id="item-detail-comments"
              aria-labelledby="item-detail-comments-heading"
              className="space-y-2.5"
            >
              {visibleComments.map((c, i) => (
                <li key={i} className="text-xs leading-relaxed">
                  <span className="font-medium text-ink">{c.author}</span>
                  <span className="text-muted">：{c.content}</span>
                </li>
              ))}
            </ul>
            {comments.length > 3 ? (
              <button
                type="button"
                aria-expanded={showAllComments}
                aria-controls="item-detail-comments"
                onClick={() => setShowAllComments((v) => !v)}
                className={cn('mt-2 inline-flex min-h-9 items-center text-xs', textLinkClass())}
              >
                {showAllComments
                  ? t('feed.collapseComments')
                  : t('feed.expandComments', { count: comments.length - 3 })}
              </button>
            ) : null}
          </div>
        ) : null}
      </>
    )
  }

  return (
    <>
      {showLead ? <p className="mb-4 text-sm leading-relaxed text-ink/90">{leadText}</p> : null}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{data.text}</p>
    </>
  )
}
