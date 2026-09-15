import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../layout/useFocusTrap'
import { cn } from '../../lib/cn'

/**
 * Immersive focus panel: right drawer on lg+, bottom sheet on small screens.
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
  labelledById = 'immersive-drawer-title',
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
    <div className="fixed inset-0 z-[50]" role="presentation">
      <button
        type="button"
        aria-label={t('magazine.closeDrawer')}
        className="absolute inset-0 bg-ink/25 backdrop-blur-[1px] mag-drawer-backdrop"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? labelledById : undefined}
        className={cn(
          'mag-drawer absolute flex flex-col bg-surface shadow-2xl border-border',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t',
          // Desktop: right panel
          'md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:w-[min(480px,100%)] md:rounded-none md:border-t-0 md:border-l',
        )}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-border px-4 py-3 md:px-5">
          <div className="min-w-0 flex-1">
            {title ? (
              titleHref ? (
                <a
                  id={labelledById}
                  href={titleHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onTitleNavigate}
                  className="block text-base font-semibold leading-snug text-ink hover:text-accent"
                >
                  {title}
                </a>
              ) : (
                <h2 id={labelledById} className="text-base font-semibold leading-snug text-ink">
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
            className="shrink-0 rounded-md px-2 py-1 text-sm text-muted hover:bg-border hover:text-ink"
            aria-label={t('magazine.closeDrawer')}
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto thin-scroll px-4 py-4 md:px-5">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-border bg-surface px-4 py-3 md:px-5">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
