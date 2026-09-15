import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { ScorePill } from '../score/ScorePill'
import { coverShortLabel, coverSourceClass } from './magCover'

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
  sourceType,
  coverLabel,
  tags,
  meta,
  actions,
  secondaryActions,
  dataId,
  href,
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
  /** Connector type — drives source chip hue. */
  sourceType?: string
  /** Override source chip text (defaults from sourceType). */
  coverLabel?: string
  tags?: string[]
  meta?: ReactNode
  /** Primary footer actions (always visible): save / dismiss. */
  actions?: ReactNode
  /** Secondary actions (hover / selected): details / read. */
  secondaryActions?: ReactNode
  /** For scroll-into-view / focus restore (`data-item-id` or `data-mag-id`). */
  dataId?: string | number
  /** When set, primary click opens this URL in a new tab. */
  href?: string
  onSelect?: () => void
  /**
   * Primary activate (card click / Enter).
   * Prefer for opening the original URL when `href` is set.
   */
  onOpen?: () => void
  className?: string
}) {
  const activate = (e?: MouseEvent | KeyboardEvent) => {
    e?.stopPropagation()
    onSelect?.()
    if (href) {
      window.open(href, '_blank', 'noopener')
    }
    onOpen?.()
  }

  const label = coverLabel ?? coverShortLabel(sourceType)
  const shownTags = (tags ?? []).filter(Boolean).slice(0, 2)

  return (
    <article
      className={cn(
        'mag-card group',
        tierClass(tier),
        coverSourceClass(sourceType),
        selected && 'selected',
        unread === false && 'is-read',
        dimmed && !selected && 'is-dimmed',
        className,
      )}
      data-mag-id={dataId}
      data-item-id={dataId}
      onClick={() => activate()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          activate(e)
        }
      }}
      role="button"
      tabIndex={0}
      aria-selected={selected}
    >
      <div className="mag-card-body">
        <div className="mag-card-top">
          <span className="mag-source-chip" aria-hidden={!label}>
            {label}
          </span>
          <div className="mag-card-top-right">
            {unread ? <span className="mag-unread-dot" /> : null}
            {score != null ? <ScorePill score={score} /> : null}
          </div>
        </div>

        <h3
          className={cn(
            'mt-2 text-[14px] font-semibold leading-snug line-clamp-3',
            unread === false ? 'text-ink/70' : 'text-ink',
          )}
        >
          {title}
        </h3>
        {titleSecondary ? (
          <p className="mt-0.5 text-[11px] text-faint line-clamp-1" title={titleSecondary}>
            {titleSecondary}
          </p>
        ) : null}
        {lead ? (
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink/75 line-clamp-3" title={lead}>
            {lead}
          </p>
        ) : null}
        {meta ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
            {meta}
          </div>
        ) : null}
        {shownTags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {shownTags.map((tag) => (
              <span key={tag} className="mag-tag">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {actions || secondaryActions ? (
        <div className="mag-card-footer" onClick={(e) => e.stopPropagation()}>
          {actions ? <div className="flex flex-wrap items-center gap-0.5">{actions}</div> : null}
          {secondaryActions ? (
            <div
              className={cn(
                'flex flex-wrap items-center gap-0.5 transition',
                selected
                  ? 'opacity-100'
                  : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
              )}
            >
              {secondaryActions}
            </div>
          ) : null}
        </div>
      ) : null}
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
  title,
}: {
  children: ReactNode
  onClick?: () => void
  href?: string
  tone?: 'default' | 'moss' | 'ember' | 'accent'
  disabled?: boolean
  title?: string
}) {
  const toneCls =
    tone === 'moss'
      ? 'hover:bg-moss/10 hover:text-moss'
      : tone === 'ember'
        ? 'hover:bg-ember/10 hover:text-ember'
        : tone === 'accent'
          ? 'bg-accent text-white hover:bg-accent/90 hover:text-white'
          : 'hover:bg-border hover:text-ink'
  const cls = cn(
    'inline-flex items-center rounded-md px-2 py-1 text-xs transition',
    tone === 'accent' ? 'font-medium text-white' : 'text-muted',
    toneCls,
    disabled && 'pointer-events-none opacity-50',
  )
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className={cls} title={title}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cls} title={title}>
      {children}
    </button>
  )
}
