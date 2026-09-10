import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

export const buttonVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md font-medium transition duration-150 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-surface hover:opacity-90',
        ghost: 'border border-border bg-surface text-ink hover:bg-border/50',
        danger: 'border border-red-500/60 text-red-500 hover:bg-red-500/10',
        text: 'bg-transparent text-muted hover:text-ink underline-offset-2 hover:underline',
        icon: 'h-8 w-8 justify-center rounded-md text-muted hover:bg-border/60 hover:text-ink',
      },
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-2.5 py-1.5 text-sm',
        lg: 'px-3.5 py-2 text-base',
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
          className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  )
})
