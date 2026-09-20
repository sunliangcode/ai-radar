import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../layout/useFocusTrap'
import { cn, focusRingClass } from '../../lib/cn'

/**
 * Immersive focus panel: centered modal on all breakpoints.
 * Esc / backdrop closes; focus is trapped while open.
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

  useFocusTrap({ open, onClose, containerRef: panelRef, initialFocusRef: closeRef })

  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      returnFocusRef.current?.focus?.({ preventScroll: true })
      returnFocusRef.current = null
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[50] flex items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
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
          'mag-drawer relative flex w-full max-w-2xl max-h-[85vh] flex-col rounded-2xl border border-border bg-surface shadow-2xl',
        )}
      >
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
