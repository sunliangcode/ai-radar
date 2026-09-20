import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

export const buttonVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md font-medium transition duration-150 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-surface hover:opacity-90',
        ghost: 'border border-border bg-surface text-ink hover:bg-border/50',
        danger: 'border border-red-500/60 text-red-500 hover:bg-red-500/10',
        text: 'bg-transparent text-muted hover:text-ink underline-offset-2 hover:underline',
        icon: 'h-9 w-9 justify-center rounded-md text-muted hover:bg-border/60 hover:text-ink sm:h-8 sm:w-8',
      },
      size: {
        sm: 'min-h-9 px-2.5 py-1.5 text-xs',
        md: 'min-h-9 px-2.5 py-1.5 text-sm',
        lg: 'min-h-10 px-3.5 py-2 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, disabled, type = 'button', children, ...props },
  ref,
) {
  const busy = !!loading
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {busy ? (
        <span
          className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent motion-reduce:animate-none"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  )
})
