import { useEffect } from 'react'
import type { Item } from '../../lib/api'
import { isZhihuSource } from '../../components/magazine/magCover'

/**
 * Feed keyboard: j/k move; Enter open original (drawer for Zhihu); o open drawer; s save; m read; / search.
 * When the drawer is open, j/k still advances selection (drawer content follows).
 */
export function useFeedKeyboard({
  items,
  selectedId,
  drawerOpen,
  onSelect,
  onOpenDrawer,
  onCloseDrawer,
  onOpenExternal,
  onToggleSaved,
  onMarkRead,
  onFocusSearch,
}: {
  items: Item[]
  selectedId: number | null
  drawerOpen: boolean
  onSelect: (id: number) => void
  onOpenDrawer: (id: number) => void
  onCloseDrawer: () => void
  onOpenExternal: (item: Item) => void
  onToggleSaved: (item: Item) => void
  onMarkRead: (item: Item) => void
  onFocusSearch: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === 'Escape' && drawerOpen) {
        e.preventDefault()
        onCloseDrawer()
        return
      }

      const idx = items.findIndex((i) => i.id === selectedId)
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        const next = items[Math.min(items.length - 1, Math.max(0, idx) + 1)]
        if (next) onSelect(next.id)
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = items[Math.max(0, (idx < 0 ? 0 : idx) - 1)]
        if (prev) onSelect(prev.id)
      } else if (e.key === 'Enter') {
        const cur = items[idx] ?? (selectedId == null ? items[0] : undefined)
        if (cur) {
          e.preventDefault()
          if (isZhihuSource(cur.primarySourceType)) onOpenDrawer(cur.id)
          else onOpenExternal(cur)
        }
      } else if (e.key === 'o') {
        const cur = items[idx] ?? (selectedId == null ? items[0] : undefined)
        if (cur) {
          e.preventDefault()
          onOpenDrawer(cur.id)
        }
      } else if (e.key === 's') {
        const cur = items[idx]
        if (cur) onToggleSaved(cur)
      } else if (e.key === 'm') {
        const cur = items[idx]
        if (cur && !cur.read) onMarkRead(cur)
      } else if (e.key === '/') {
        e.preventDefault()
        onFocusSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    items,
    selectedId,
    drawerOpen,
    onSelect,
    onOpenDrawer,
    onCloseDrawer,
    onOpenExternal,
    onToggleSaved,
    onMarkRead,
    onFocusSearch,
  ])
}
