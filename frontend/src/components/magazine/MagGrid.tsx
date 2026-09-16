import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Waterfall magazine grid: 2 cols mobile, 3 from md (CSS columns). List: denser single-source. */
export function MagGrid({
  children,
  className,
  dimmed,
  variant = 'waterfall',
  ...props
}: {
  children: ReactNode
  /** Soften the grid while the immersive drawer is open. */
  dimmed?: boolean
  /** `list` caps at 2 columns for filtered single-source reading. */
  variant?: 'waterfall' | 'list'
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        variant === 'list' ? 'mag-grid mag-grid--list' : 'mag-grid',
        dimmed && 'mag-grid-dimmed',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
