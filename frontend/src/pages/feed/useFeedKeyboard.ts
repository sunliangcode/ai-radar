import { useEffect } from 'react'
import type { Item } from '../../lib/api'
import { isAriaModalOpen, isEditableTarget } from '../../lib/a11y'

/**
 * Feed keyboard: j/k (n/p in focus) move; Enter / o open in-app reader;
 * s save; x not-interested (advance); m read; / search; [ ] page.
 * When the drawer is open, j/k still advances selection (drawer content follows).
 */
export function useFeedKeyboard({
  items,
  selectedId,
  drawerOpen,
  focusMode,
  onSelect,
  onOpenDrawer,
  onCloseDrawer,
  onOpenExternal,
  onToggleSaved,
  onDismiss,
  onMarkRead,
  onFocusSearch,
  onPagePrev,
  onPageNext,
}: {
  items: Item[]
  selectedId: number | null
  drawerOpen: boolean
  focusMode?: boolean
  onSelect: (id: number) => void
  onOpenDrawer: (id: number) => void
  onCloseDrawer: () => void
  onOpenExternal: (item: Item) => void
  onToggleSaved: (item: Item) => void
  onDismiss?: (item: Item) => void
  onMarkRead: (item: Item) => void
  onFocusSearch: () => void
  onPagePrev?: () => void
  onPageNext?: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Modal dialogs (⌘K, confirm, immersive) own the keyboard
      if (isAriaModalOpen()) return

      if (e.key === 'Escape' && drawerOpen) {
        e.preventDefault()
        onCloseDrawer()
        return
      }

      const idx = items.findIndex((i) => i.id === selectedId)
      const goNext = () => {
        const next = items[Math.min(items.length - 1, Math.max(0, idx) + 1)]
        if (next) onSelect(next.id)
      }
      const goPrev = () => {
        const prev = items[Math.max(0, (idx < 0 ? 0 : idx) - 1)]
        if (prev) onSelect(prev.id)
      }

      if (e.key === 'j' || e.key === 'ArrowDown' || (focusMode && e.key === 'n')) {
        e.preventDefault()
        goNext()
      } else if (e.key === 'k' || e.key === 'ArrowUp' || (focusMode && e.key === 'p')) {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'Enter' || e.key === 'o') {
        const cur = items[idx] ?? (selectedId == null ? items[0] : undefined)
        if (cur) {
          e.preventDefault()
          onOpenDrawer(cur.id)
        }
      } else if (e.key === 'u' || e.key === 'U') {
        const cur = items[idx] ?? (selectedId == null ? items[0] : undefined)
        if (cur) {
          e.preventDefault()
          onOpenExternal(cur)
        }
      } else if (e.key === 's') {
        const cur = items[idx]
        if (cur) onToggleSaved(cur)
      } else if (e.key === 'x' || e.key === 'X') {
        const cur = items[idx]
        if (cur && onDismiss) {
          e.preventDefault()
          const next = items[Math.min(items.length - 1, Math.max(0, idx) + 1)]
          onDismiss(cur)
          if (next && next.id !== cur.id) onSelect(next.id)
        }
      } else if (e.key === 'm') {
        const cur = items[idx]
        if (cur && !cur.read) onMarkRead(cur)
      } else if (e.key === '/') {
        e.preventDefault()
        onFocusSearch()
      } else if (e.key === '[') {
        if (onPagePrev) {
          e.preventDefault()
          onPagePrev()
        }
      } else if (e.key === ']') {
        if (onPageNext) {
          e.preventDefault()
          onPageNext()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    items,
    selectedId,
    drawerOpen,
    focusMode,
    onSelect,
    onOpenDrawer,
    onCloseDrawer,
    onOpenExternal,
    onToggleSaved,
    onDismiss,
    onMarkRead,
    onFocusSearch,
    onPagePrev,
    onPageNext,
  ])
}
