import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

/** Horizontal progress bar. `value` is clamped to 0-100. */
export function ProgressBar({
  value,
  className,
  barClassName,
  label,
  ...props
}: {
  value: number
  barClassName?: string
  label?: string
} & HTMLAttributes<HTMLDivElement>) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={cn('h-2 overflow-hidden rounded-full bg-border', className)}
      {...props}
    >
      <div
        className={cn('h-full rounded-full bg-moss transition-[width] duration-300', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
