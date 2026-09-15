import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Responsive magazine grid: 1 col mobile, 2 cols from lg. */
export function MagGrid({
  children,
  className,
  dimmed,
  ...props
}: {
  children: ReactNode
  /** Soften the grid while the immersive drawer is open. */
  dimmed?: boolean
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mag-grid grid grid-cols-1 gap-[var(--row-gap,0.75rem)] lg:grid-cols-2',
        dimmed && 'mag-grid-dimmed',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
