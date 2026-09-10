import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'

/** Status badge for changes/actions (tier, status). */
export function StatusBadge({ status, className }: { status?: string; className?: string }) {
  const { t } = useTranslation()
  if (!status) return null
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-ink',
        className,
      )}
    >
      {t(`events.status.${status}`, { defaultValue: status })}
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
  return (
    <span className={cn('inline-flex items-center rounded-sm border px-1 py-px text-[10px] font-medium', cls)}>
      {source === 'ai' ? t('score.ai') : t('score.rule')}
    </span>
  )
}

const SOURCE_COLORS: Record<string, string> = {
  ZHIHU: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  GITHUB: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  HACKER_NEWS: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  REDDIT: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

/** Colored source-type badge (ZHIHU / GITHUB / HACKER_NEWS / …). */
export function SourceBadge({ type, className }: { type?: string; className?: string }) {
  if (!type) return null
  return (
    <span
      className={cn(
        'rounded px-1.5 py-px text-[10px] font-mono',
        SOURCE_COLORS[type] ?? 'bg-border text-muted',
        className,
      )}
    >
      {type}
    </span>
  )
}
