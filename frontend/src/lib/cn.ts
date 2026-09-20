import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge conditional class names, resolving Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Shared text-link style with keyboard focus ring. */
export function textLinkClass(tone: 'accent' | 'moss' = 'accent') {
  return cn(
    'rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg',
    tone === 'moss' ? 'text-moss' : 'text-accent',
  )
}

/** Compact control focus ring (chips, icon buttons, filters). */
export function focusRingClass(offset: 'bg' | 'none' = 'bg') {
  return cn(
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
    offset === 'bg' && 'focus-visible:ring-offset-1 focus-visible:ring-offset-bg',
  )
}
