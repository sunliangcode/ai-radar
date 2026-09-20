import { useEffect, type RefObject } from 'react'

/**
 * Trap Tab focus inside a dialog while open; close on Escape.
 * Shared by ConfirmDialog, CommandPalette and future modals.
 */
export function useFocusTrap({
  open,
  onClose,
  containerRef,
  initialFocusRef,
}: {
  open: boolean
  onClose: () => void
  containerRef: RefObject<HTMLElement | null>
  initialFocusRef?: RefObject<HTMLElement | null>
}) {
  useEffect(() => {
    if (!open) return
    initialFocusRef?.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const root = containerRef.current
      if (!root) return
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => {
        if (el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled')) return false
        if (el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('hidden')) return false
        if (el.closest('[aria-hidden="true"], [hidden], [inert]')) return false
        return true
      })
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, containerRef, initialFocusRef])
}
