import { useEffect, useId, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../layout/useFocusTrap'
import { prefersReducedMotion } from '../../lib/a11y'
import { cn, focusRingClass } from '../../lib/cn'

const SHEET_DISMISS_PX = 80

/**
 * Immersive reader: bottom sheet on small screens, centered modal on md+.
 * Esc / backdrop / drag-down (sheet) closes; focus is trapped while open.
 */
export function ImmersiveDrawer({
  open,
  onClose,
  title,
  titleHref,
  onTitleNavigate,
  subtitle,
  headerAction,
  children,
  footer,
  labelledById,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  /** Makes the title a link to the original article. */
  titleHref?: string
  onTitleNavigate?: () => void
  subtitle?: ReactNode
  /** Prominent control in the header (e.g. open original). */
  headerAction?: ReactNode
  children: ReactNode
  footer?: ReactNode
  labelledById?: string
}) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const generatedTitleId = useId()
  const titleId = labelledById ?? generatedTitleId
  const [dragY, setDragY] = useState(0)
  const startY = useRef<number | null>(null)

  useFocusTrap({ open, onClose, containerRef: panelRef, initialFocusRef: closeRef })

  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      returnFocusRef.current?.focus?.({ preventScroll: true })
      returnFocusRef.current = null
      setDragY(0)
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const onHandleTouchStart = (e: TouchEvent) => {
    if (prefersReducedMotion()) return
    const touch = e.touches[0]
    if (!touch) return
    startY.current = touch.clientY
  }

  const onHandleTouchMove = (e: TouchEvent) => {
    if (startY.current == null) return
    const touch = e.touches[0]
    if (!touch) return
    const dy = Math.max(0, touch.clientY - startY.current)
    setDragY(dy)
  }

  const onHandleTouchEnd = () => {
    if (dragY >= SHEET_DISMISS_PX) onClose()
    startY.current = null
    setDragY(0)
  }

  const sheetStyle =
    dragY > 0
      ? { transform: `translateY(${dragY}px)`, transition: 'none' }
      : prefersReducedMotion()
        ? undefined
        : { transition: 'transform 200ms ease-out' }

  return (
    <div
      className="fixed inset-0 z-[50] flex items-end justify-center md:items-center md:px-4 md:pb-[max(1rem,env(safe-area-inset-bottom))] md:pt-[max(1rem,env(safe-area-inset-top))]"
      role="presentation"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={t('magazine.closeDrawer')}
        className="absolute inset-0 bg-ink/25 backdrop-blur-[1px] mag-drawer-backdrop motion-reduce:backdrop-blur-none"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : t('magazine.drawerFallback')}
        className={cn(
          'mag-drawer relative flex w-full flex-col border border-border bg-surface shadow-2xl',
          /* Mobile: full-bleed bottom sheet */
          'max-h-[min(96dvh,100%)] rounded-t-2xl border-b-0 md:max-h-[85vh] md:max-w-2xl md:rounded-2xl md:border-b',
        )}
        style={sheetStyle}
      >
        {/* Sheet drag handle — mobile only */}
        <div
          className="flex shrink-0 justify-center pt-2 pb-1 md:hidden"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
          onTouchCancel={onHandleTouchEnd}
        >
          <div
            className="h-1.5 w-10 rounded-full bg-border"
            aria-hidden
          />
          <span className="sr-only">{t('magazine.sheetDragHint')}</span>
        </div>

        <div className="flex shrink-0 items-start gap-3 border-b border-border px-4 py-3 md:px-5">
          <div className="min-w-0 flex-1">
            {title ? (
              titleHref ? (
                <a
                  id={titleId}
                  href={titleHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onTitleNavigate}
                  aria-label={typeof title === 'string' ? title : t('magazine.drawerFallback')}
                  className={cn(
                    'block rounded-sm text-base font-semibold leading-snug text-ink transition-colors motion-reduce:transition-none hover:text-accent',
                    focusRingClass('none'),
                  )}
                >
                  {title}
                </a>
              ) : (
                <h2 id={titleId} className="text-base font-semibold leading-snug text-ink">
                  {title}
                </h2>
              )
            ) : null}
            {subtitle ? <div className="mt-1 text-xs text-muted">{subtitle}</div> : null}
            {headerAction ? <div className="mt-2.5">{headerAction}</div> : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={cn(
              'inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md text-sm text-muted hover:bg-border hover:text-ink',
              focusRingClass('none'),
            )}
            aria-label={t('magazine.closeDrawer')}
          >
            <span aria-hidden>✕</span>
          </button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto thin-scroll px-4 py-4 md:px-5"
          role="region"
          aria-label={typeof title === 'string' ? title : t('magazine.drawerFallback')}
        >
          {children}
        </div>
        {footer ? (
          <div
            className="shrink-0 border-t border-border bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5"
            role="group"
            aria-label={t('magazine.drawerActions')}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
