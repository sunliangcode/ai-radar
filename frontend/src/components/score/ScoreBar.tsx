import { cn } from '../../lib/cn'
import { ScoreSourceBadge } from '../primitives/Badge'

/**
 * Honest, explainable score meter. Shows the number plus a bar, and labels
 * whether the score came from rules (rule) or an LLM (ai).
 */
export function ScoreBar({
  score,
  source,
  reason,
  size = 'md',
}: {
  score?: number
  source?: 'rule' | 'ai' | 'unknown'
  reason?: string
  size?: 'sm' | 'md'
}) {
  const value = score == null ? 0 : Math.max(0, Math.min(100, score))
  const cls = value >= 70 ? '' : value >= 45 ? 'medium' : 'low'
  const rounded = Math.round(value)
  const hasScore = score != null
  const label = reason
    ? `${rounded}: ${reason}`
    : hasScore
      ? String(rounded)
      : undefined
  return (
    <div className="flex flex-col gap-1" title={reason ?? ''}>
      <div className="flex items-center gap-2">
        <span
          className={cn('font-mono font-semibold tabular-nums text-ink', size === 'sm' ? 'text-xs' : 'text-sm')}
          aria-hidden
        >
          {hasScore ? rounded : '—'}
        </span>
        <ScoreSourceBadge source={source} />
      </div>
      <div
        className={cn('score-bar', cls, size === 'sm' ? 'w-10' : 'w-14')}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hasScore ? rounded : undefined}
        aria-valuetext={hasScore ? undefined : '—'}
        aria-label={label}
      >
        <span
          style={{ width: `${hasScore ? value : 0}%` }}
          className="transition-[width] duration-300 motion-reduce:transition-none"
        />
      </div>
    </div>
  )
}
