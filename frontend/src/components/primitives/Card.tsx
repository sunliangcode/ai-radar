import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const cardVariants = cva('rounded-xl border border-border bg-surface', {
  variants: {
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5',
    },
    hover: {
      true: 'transition motion-reduce:transition-none hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    },
  },
  defaultVariants: {
    padding: 'md',
  },
})

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, padding, hover, ...props }: CardProps) {
  return <div className={cn(cardVariants({ padding, hover }), className)} {...props} />
}
