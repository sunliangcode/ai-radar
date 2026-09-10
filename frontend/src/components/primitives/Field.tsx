import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Label + control + optional hint, the standard form field wrapper. */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block text-sm', className)}>
      <span className="text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  )
}
