import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BriefEntry } from '../../lib/parseBriefMarkdown'
import { ScorePill } from '../score/ScorePill'
import { cn } from '../../lib/cn'

function formatPublished(iso: string | undefined, locale: string): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  return new Date(t).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function BriefEntryCard({
  entry,
  locale,
  variant = 'item',
  className,
}: {
  entry: BriefEntry
  locale: string
  variant?: 'item' | 'event'
  className?: string
}) {
  const { t } = useTranslation()
  const published = formatPublished(entry.published, locale)
  const tags = entry.tags.slice(0, 4)
  const tagOverflow = entry.tags.length - tags.length

  return (
    <article
      className={cn(
        'brief-entry rounded-2xl border border-border bg-surface p-4 md:p-5',
        entry.rank <= 3 && variant === 'item' && 'brief-entry--top',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="brief-entry-rank flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg font-mono text-sm font-semibold tabular-nums text-muted"
          aria-hidden
        >
          {entry.rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-snug text-ink md:text-[1.05rem]">
              {entry.url ? (
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent transition-colors"
                >
                  {entry.title}
                </a>
              ) : (
                entry.title
              )}
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              {entry.score != null ? <ScorePill score={entry.score} /> : null}
              {entry.status ? (
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                  {entry.status}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {entry.category ? (
              <span className="rounded-md border border-border bg-bg px-2 py-0.5 text-[10px] font-medium text-muted">
                {entry.category}
              </span>
            ) : null}
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-accent-soft/60 px-2 py-0.5 text-[10px] text-muted"
              >
                {tag}
              </span>
            ))}
            {tagOverflow > 0 ? (
              <span className="text-[10px] text-faint">+{tagOverflow}</span>
            ) : null}
          </div>

          {entry.summary ? (
            <p className="mt-3 text-sm leading-relaxed text-ink/90">{entry.summary}</p>
          ) : null}

          {variant === 'event' && entry.impact ? (
            <p className="mt-3 text-sm leading-relaxed">
              <span className="font-medium text-ink">{t('briefs.impact')}: </span>
              <span className="text-muted">{entry.impact}</span>
            </p>
          ) : null}
          {variant === 'event' && entry.watchNext ? (
            <p className="mt-2 text-sm leading-relaxed">
              <span className="font-medium text-ink">{t('briefs.watchNext')}: </span>
              <span className="text-muted">{entry.watchNext}</span>
            </p>
          ) : null}

          {entry.evidence.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {entry.evidence.map((ev) => (
                <li key={ev.url}>
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent underline-offset-2 hover:underline"
                  >
                    {ev.title}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {published ? (
              <span className="text-xs text-faint">
                {t('briefs.publishedAt', { time: published })}
              </span>
            ) : (
              <span />
            )}
            {entry.url ? (
              <a
                href={entry.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2.5 py-1 text-xs font-medium text-ink transition hover:border-accent/40 hover:text-accent"
              >
                {t('briefs.openOriginal')}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
