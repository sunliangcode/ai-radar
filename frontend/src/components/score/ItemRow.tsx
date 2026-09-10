import { useTranslation } from 'react-i18next'
import { ScorePill } from './ScorePill'

/**
 * @deprecated Legacy row kept for SourceDetailPage. New lists should use
 * FeedRow or compose ScoreBar/Badge directly.
 */
export function ItemRow({
  title,
  score,
  summary,
  contentSnippet,
  url,
  meta,
  unread,
  saved,
  onMarkRead,
  onToggleSaved,
}: {
  title: string
  score?: number
  summary?: string
  contentSnippet?: string
  url: string
  meta?: string
  unread?: boolean
  saved?: boolean
  onMarkRead?: () => void
  onToggleSaved?: () => void
}) {
  const { t } = useTranslation()
  const body = (contentSnippet && contentSnippet.trim()) || (summary && summary.trim()) || ''
  return (
    <article className={`row-py border-b border-border/70 last:border-0 ${unread ? '' : 'opacity-70'}`}>
      <div className="flex items-start gap-3">
        <ScorePill score={score} />
        <div className="min-w-0 flex-1">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-ink transition duration-150 hover:underline"
          >
            {title}
          </a>
          {body ? <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">{body}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
            {meta ? <span className="font-mono">{meta}</span> : null}
            {onToggleSaved ? (
              <button type="button" className="underline hover:text-ink" onClick={onToggleSaved}>
                {saved ? t('common.unsaveInterest') : t('common.saveInterest')}
              </button>
            ) : null}
            {onMarkRead && unread ? (
              <button type="button" className="underline hover:text-ink" onClick={onMarkRead}>
                {t('common.markRead')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
