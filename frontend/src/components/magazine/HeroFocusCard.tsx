import type { ReactNode } from 'react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { cn, focusRingClass } from '../../lib/cn'
import { ScorePill } from '../score/ScorePill'
import { MagAction } from './MagCard'

export function HeroFocusCard({
  title,
  why,
  evidence,
  score,
  tier,
  onOpen,
  actions,
  className,
}: {
  title: string
  why?: string
  evidence?: string
  score?: number
  tier?: string
  onOpen?: () => void
  actions?: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const isHigh = (tier ?? '').toUpperCase() === 'HIGH'

  return (
    <section
      className={cn(
        'mag-hero mb-4 rounded-2xl border border-border bg-surface p-5 md:p-6',
        isHigh && 'mag-hero-high',
        className,
      )}
      aria-labelledby={titleId}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-accent">
        {t('today.heroLead')}
      </p>
      <div className="mt-2 flex items-start gap-3">
        <h2 id={titleId} className="min-w-0 flex-1 text-xl font-semibold leading-snug text-ink md:text-2xl">
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              className={cn(
                'rounded-sm text-left transition-colors motion-reduce:transition-none hover:text-accent',
                focusRingClass(),
              )}
            >
              {title}
            </button>
          ) : (
            title
          )}
        </h2>
        {score != null ? <ScorePill score={score} /> : null}
      </div>
      {tier ? (
        <span className="mt-2 inline-block font-mono text-[11px] text-muted">{tier}</span>
      ) : null}
      {why ? <p className="mt-3 text-sm leading-relaxed text-ink/90">{why}</p> : null}
      {evidence ? <p className="mt-2 text-xs leading-relaxed text-muted">{evidence}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {onOpen ? (
          <MagAction onClick={onOpen} tone="moss" title={t('today.heroOpen')}>
            {t('today.heroOpen')}
          </MagAction>
        ) : null}
        {actions}
      </div>
    </section>
  )
}
