import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
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
  const hintId = useId()
  const child = Children.only(children)
  const control =
    hint && isValidElement(child)
      ? cloneElement(child as ReactElement<{ 'aria-describedby'?: string }>, {
          'aria-describedby': [
            (child.props as { 'aria-describedby'?: string })['aria-describedby'],
            hintId,
          ]
            .filter(Boolean)
            .join(' '),
        })
      : children

  return (
    <label className={cn('block text-sm', className)}>
      <span className="mb-1 block text-muted">{label}</span>
      {control}
      {hint ? (
        <span id={hintId} className="mt-1 block text-xs text-muted">
          {hint}
        </span>
      ) : null}
    </label>
  )
}
