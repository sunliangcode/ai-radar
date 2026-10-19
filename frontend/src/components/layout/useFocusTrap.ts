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

    const focusables = () => {
      const root = containerRef.current
      if (!root) return [] as HTMLElement[]
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => {
        if (el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled')) return false
        if (el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('hidden')) return false
        if (el.closest('[aria-hidden="true"], [hidden], [inert]')) return false
        return true
      })
    }

    // Defer so the dialog is in the DOM and painted before focusing.
    const frame = window.requestAnimationFrame(() => {
      const preferred = initialFocusRef?.current
      if (preferred && containerRef.current?.contains(preferred)) {
        preferred.focus()
        return
      }
      focusables()[0]?.focus()
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const list = focusables()
      if (list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open, onClose, containerRef, initialFocusRef])
}
