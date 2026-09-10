import { useEffect } from 'react'
import type { Item } from '../../lib/api'

/**
 * Global keyboard navigation for the feed list.
 * j/ArrowDown, k/ArrowUp — move selection; o — expand signals; Enter — open;
 * s — toggle saved; m — mark read; / — focus search.
 */
export function useFeedKeyboard({
  items,
  selectedId,
  onSelect,
  onExpand,
  onOpen,
  onToggleSaved,
  onMarkRead,
  onFocusSearch,
}: {
  items: Item[]
  selectedId: number | null
  onSelect: (id: number) => void
  onExpand: (id: number) => void
  onOpen: (item: Item) => void
  onToggleSaved: (item: Item) => void
  onMarkRead: (item: Item) => void
  onFocusSearch: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const idx = items.findIndex((i) => i.id === selectedId)
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        const next = items[Math.min(items.length - 1, idx + 1)]
        if (next) onSelect(next.id)
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = items[Math.max(0, idx - 1)]
        if (prev) onSelect(prev.id)
      } else if (e.key === 'o') {
        const cur = items[idx]
        if (cur) {
          e.preventDefault()
          onExpand(cur.id)
        }
      } else if (e.key === 'Enter') {
        const cur = items[idx]
        if (cur) onOpen(cur)
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
  }, [items, selectedId, onSelect, onExpand, onOpen, onToggleSaved, onMarkRead, onFocusSearch])
}
