import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { ScorePill } from '../score/ScorePill'

export type MagTier = 'HIGH' | 'MEDIUM' | 'LOW' | string

function tierClass(tier?: MagTier): string {
  const t = (tier ?? '').toUpperCase()
  if (t === 'HIGH') return 'tier-high'
  if (t === 'MEDIUM' || t === 'MED') return 'tier-med'
  if (t === 'LOW') return 'tier-low'
  return 'tier-default'
}

export function MagCard({
  title,
  titleSecondary,
  lead,
  score,
  tier,
  unread,
  selected,
  dimmed,
  meta,
  actions,
  dataId,
  onSelect,
  onOpen,
  className,
}: {
  title: string
  titleSecondary?: string
  /** Hook line under the title (why / summary / scoreReason). */
  lead?: string
  score?: number
  tier?: MagTier
  unread?: boolean
  selected?: boolean
  /** When the drawer is open and this card is not focused. */
  dimmed?: boolean
  meta?: ReactNode
  actions?: ReactNode
  /** For scroll-into-view / focus restore (`data-item-id` or `data-mag-id`). */
  dataId?: string | number
  onSelect?: () => void
  /** Primary open (drawer). Title click / Enter. */
  onOpen?: () => void
  className?: string
}) {
  const open = (e?: MouseEvent | KeyboardEvent) => {
    e?.stopPropagation()
    onSelect?.()
    onOpen?.()
  }

  return (
    <article
      className={cn(
        'mag-card group row-py px-4',
        tierClass(tier),
        selected && 'selected',
        unread === false && 'is-read',
        dimmed && !selected && 'is-dimmed',
        className,
      )}
      data-mag-id={dataId}
      data-item-id={dataId}
      onClick={() => {
        onSelect?.()
        onOpen?.()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open(e)
        }
      }}
      role="button"
      tabIndex={0}
      aria-selected={selected}
    >
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3
              className={cn(
                'min-w-0 flex-1 text-[15px] font-semibold leading-snug line-clamp-2',
                unread === false ? 'text-ink/70' : 'text-ink',
              )}
            >
              {title}
            </h3>
            {score != null ? (
              <div className="shrink-0 pt-0.5">
                <ScorePill score={score} />
              </div>
            ) : null}
          </div>
          {titleSecondary ? (
            <p className="mt-0.5 text-[11px] text-faint line-clamp-1" title={titleSecondary}>
              {titleSecondary}
            </p>
          ) : null}
          {lead ? (
            <p className="mt-1.5 text-[13px] leading-snug text-ink/80 line-clamp-3" title={lead}>
              {lead}
            </p>
          ) : null}
          {meta ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
              {meta}
            </div>
          ) : null}
          {actions ? (
            <div
              className={cn(
                'mt-2 flex flex-wrap items-center gap-1 transition',
                selected ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

/** Compact pill buttons for MagCard / drawer action bars. */
export function MagAction({
  children,
  onClick,
  href,
  tone = 'default',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  href?: string
  tone?: 'default' | 'moss' | 'ember'
  disabled?: boolean
}) {
  const toneCls =
    tone === 'moss'
      ? 'hover:bg-moss/10 hover:text-moss'
      : tone === 'ember'
        ? 'hover:bg-ember/10 hover:text-ember'
        : 'hover:bg-border hover:text-ink'
  const cls = cn(
    'inline-flex items-center rounded-md px-2 py-1 text-xs text-muted transition',
    toneCls,
    disabled && 'pointer-events-none opacity-50',
  )
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className={cls}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  )
}
