import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode, type TouchEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'
import { ScorePill } from '../score/ScorePill'
import { coverShortLabel, coverSourceClass } from './magCover'

export type MagTier = 'HIGH' | 'MEDIUM' | 'LOW' | string

const SWIPE_TRIGGER = 88
const SWIPE_MAX = 120

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
  hideSourceChip,
  tags,
  meta,
  actions,
  secondaryActions,
  dataId,
  href,
  onSelect,
  onOpen,
  onSwipeSave,
  onSwipeDismiss,
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
  /** Override source chip text (defaults from i18n / sourceType). */
  coverLabel?: string
  /** Hide chip when the page is already filtered to one source. */
  hideSourceChip?: boolean
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
  /** Touch: swipe right past threshold → save / collect. */
  onSwipeSave?: () => void
  /** Touch: swipe left past threshold → not interested. */
  onSwipeDismiss?: () => void
  className?: string
}) {
  const { t } = useTranslation()
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const axis = useRef<'h' | 'v' | null>(null)
  const [dx, setDx] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const suppressClick = useRef(false)

  const activate = (e?: MouseEvent | KeyboardEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    e?.stopPropagation()
    onSelect?.()
    if (href) {
      window.open(href, '_blank', 'noopener')
    }
    onOpen?.()
  }

  const onTouchStart = (e: TouchEvent) => {
    if (!onSwipeSave && !onSwipeDismiss) return
    const touch = e.touches[0]
    if (!touch) return
    startX.current = touch.clientX
    startY.current = touch.clientY
    axis.current = null
    setSwiping(true)
  }

  const onTouchMove = (e: TouchEvent) => {
    if (startX.current == null || startY.current == null) return
    const touch = e.touches[0]
    if (!touch) return
    const rawX = touch.clientX - startX.current
    const rawY = touch.clientY - startY.current
    if (axis.current == null) {
      if (Math.abs(rawX) < 10 && Math.abs(rawY) < 10) return
      axis.current = Math.abs(rawX) > Math.abs(rawY) ? 'h' : 'v'
      if (axis.current === 'v') {
        startX.current = null
        setDx(0)
        setSwiping(false)
        return
      }
    }
    if (axis.current !== 'h') return
    e.preventDefault()
    const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, rawX))
    if ((clamped > 0 && !onSwipeSave) || (clamped < 0 && !onSwipeDismiss)) {
      setDx(clamped * 0.25)
      return
    }
    setDx(clamped)
  }

  const finishSwipe = () => {
    if (Math.abs(dx) >= SWIPE_TRIGGER) {
      suppressClick.current = true
      if (dx > 0) onSwipeSave?.()
      else onSwipeDismiss?.()
    }
    startX.current = null
    startY.current = null
    axis.current = null
    setDx(0)
    setSwiping(false)
  }

  const label =
    coverLabel ??
    (sourceType
      ? t(`sourceType.${sourceType}`, { defaultValue: coverShortLabel(sourceType) })
      : coverShortLabel(undefined))
  const shownTags = (tags ?? []).filter(Boolean).slice(0, 2)
  const showChip = !hideSourceChip && Boolean(label)
  const saveHint = dx > 28
  const dismissHint = dx < -28

  return (
    <article
      className={cn(
        'mag-card group',
        tierClass(tier),
        coverSourceClass(sourceType),
        selected && 'selected',
        unread === false && 'is-read',
        dimmed && !selected && 'is-dimmed',
        swiping && 'mag-card--swiping',
        className,
      )}
      data-mag-id={dataId}
      data-item-id={dataId}
      style={
        dx
          ? {
              transform: `translateX(${dx}px)`,
              opacity: 1 - Math.min(0.35, Math.abs(dx) / 280),
            }
          : undefined
      }
      onClick={() => activate()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          activate(e)
        }
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={finishSwipe}
      onTouchCancel={finishSwipe}
      role="button"
      tabIndex={0}
      aria-selected={selected}
    >
      {saveHint || dismissHint ? (
        <div
          className={cn(
            'mag-swipe-hint',
            saveHint && 'mag-swipe-hint--save',
            dismissHint && 'mag-swipe-hint--dismiss',
          )}
          aria-hidden
        >
          {saveHint ? t('feed.save') : t('feed.notInterested')}
        </div>
      ) : null}
      <div className="mag-card-body">
        <div className="mag-card-top">
          {showChip ? (
            <span className="mag-source-chip" aria-hidden={!label}>
              {label}
            </span>
          ) : (
            <span />
          )}
          <div className="mag-card-top-right">
            {unread ? <span className="mag-unread-dot" /> : null}
            {score != null ? <ScorePill score={score} /> : null}
          </div>
        </div>

        <h3
          className={cn(
            'mt-2.5 text-[15px] font-semibold leading-snug line-clamp-4 tracking-tight',
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
          <p className="mt-2 text-[13px] leading-relaxed text-ink/75 line-clamp-3" title={lead}>
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
            <div className="flex flex-wrap items-center gap-0.5 opacity-100">
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
    'inline-flex items-center rounded-full px-2.5 py-1 text-xs transition',
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
