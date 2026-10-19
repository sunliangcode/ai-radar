import { useEffect } from 'react'
import { isAriaModalOpen, isEditableTarget } from '../lib/a11y'

/**
 * Esc returns to the previous list/page when no modal owns the keyboard.
 * Detail pages (Change / Source / Brief) use this for parity with native apps.
 */
export function useEscapeBack(onBack: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (isEditableTarget(e.target)) return
      if (isAriaModalOpen()) return
      e.preventDefault()
      onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack, enabled])
}
