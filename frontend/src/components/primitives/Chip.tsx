import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const chipVariants = cva(
  'inline-flex items-center gap-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      shape: {
        rect: 'rounded-md border px-2 py-1',
        pill: 'rounded-full border px-2.5 py-1',
        bare: 'rounded px-1.5 py-0.5',
      },
      tone: {
        default: 'border-border bg-surface text-muted hover:border-accent/40 hover:text-ink',
        active: 'border-accent bg-accent-soft text-accent',
        danger: 'border-border bg-surface text-muted hover:border-ember/40 hover:text-ember',
      },
    },
    defaultVariants: {
      shape: 'rect',
      tone: 'default',
    },
  },
)

export interface ChipProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {
  active?: boolean
  children?: ReactNode
}

/** Small selectable/removable tag button, used for filters, keywords and feedback. */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { className, shape, tone, active, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      className={cn(chipVariants({ shape, tone: active ? 'active' : tone }), className)}
      {...props}
    >
      {children}
    </button>
  )
})
