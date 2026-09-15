import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Waterfall magazine grid: 2 cols mobile, 3 from md (CSS columns). */
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
        'mag-grid',
        dimmed && 'mag-grid-dimmed',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
