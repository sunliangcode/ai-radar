/** True when a modal dialog (⌘K, confirm, immersive drawer) owns the keyboard. */
export function isAriaModalOpen(): boolean {
  return Boolean(document.querySelector('[aria-modal="true"]'))
}

/** Respect OS “Reduce motion” for scroll/animation behavior. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** True when the event target is an editable field (skip page-level shortcuts). */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}
