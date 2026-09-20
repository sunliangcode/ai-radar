import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'min-h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition motion-reduce:transition-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    )
  },
)
