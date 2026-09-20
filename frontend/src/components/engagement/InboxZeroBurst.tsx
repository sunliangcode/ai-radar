import { useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'

const PARTICLE_COUNT = 10

/**
 * Lightweight CSS burst for Inbox Zero / deck clear.
 * Respects prefers-reduced-motion (static copy only).
 */
export function InboxZeroBurst({
  title,
  subtitle,
  className,
  children,
}: {
  title?: string
  subtitle?: string
  className?: string
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-moss/30 bg-moss/5 px-6 py-10 text-center',
        className,
      )}
      role="status"
      aria-labelledby="inbox-zero-title"
    >
      {!reduceMotion
        ? Array.from({ length: PARTICLE_COUNT }, (_, i) => (
            <span
              key={i}
              className="inbox-zero-particle"
              style={
                {
                  '--p-i': i,
                  '--p-x': `${(i % 5) * 18 + 10}%`,
                  '--p-delay': `${i * 40}ms`,
                } as CSSProperties
              }
              aria-hidden
            />
          ))
        : null}
      <p id="inbox-zero-title" className="relative font-serif text-xl text-ink md:text-2xl">
        {title ?? t('fun.inboxZeroTitle')}
      </p>
      <p className="relative mt-2 text-sm text-muted">{subtitle ?? t('fun.inboxZeroSubtitle')}</p>
      {children ? <div className="relative mt-5 flex flex-wrap justify-center gap-3">{children}</div> : null}
    </div>
  )
}
