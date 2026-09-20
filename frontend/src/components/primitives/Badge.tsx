import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'

/** Status badge for changes/actions (tier, status). */
export function StatusBadge({ status, className }: { status?: string; className?: string }) {
  const { t } = useTranslation()
  if (!status) return null
  const label = t(`events.status.${status}`, { defaultValue: status })
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-ink',
        className,
      )}
      title={label}
      aria-label={label}
    >
      {label}
    </span>
  )
}

/** Rule/LLM score source badge. */
export function ScoreSourceBadge({ source }: { source?: 'rule' | 'ai' | 'unknown' }) {
  const { t } = useTranslation()
  if (!source || source === 'unknown') return null
  const cls =
    source === 'ai'
      ? 'border-accent/40 bg-accent/10 text-accent'
      : 'border-border bg-surface text-muted'
  const label = source === 'ai' ? t('score.ai') : t('score.rule')
  return (
    <span
      className={cn('inline-flex items-center rounded-sm border px-1 py-px text-[10px] font-medium', cls)}
      aria-label={label}
    >
      {label}
    </span>
  )
}

const SOURCE_COLORS: Record<string, string> = {
  ZHIHU: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  JUEJIN: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  CSDN: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  WEIBO: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  BILIBILI: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  DAILY_HOT: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  GITHUB: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  HACKER_NEWS: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  REDDIT: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

/** Colored source-type badge (ZHIHU / GITHUB / HACKER_NEWS / …), labelled with a display name. */
export function SourceBadge({ type, className }: { type?: string; className?: string }) {
  const { t } = useTranslation()
  if (!type) return null
  const label = t(`sourceType.${type}`, { defaultValue: type })
  return (
    <span
      className={cn(
        'rounded px-1.5 py-px text-[10px] font-mono',
        SOURCE_COLORS[type] ?? 'bg-border text-muted',
        className,
      )}
      aria-label={label}
    >
      {label}
    </span>
  )
}
