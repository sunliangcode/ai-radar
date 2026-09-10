import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api, type Item } from '../lib/api'
import { useMarkItemRead } from '../hooks/useMarkItemRead'

type Command = {
  id: string
  label: string
  hint?: string
  run: () => void
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const markItemRead = useMarkItemRead()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const markItemReadMutate = markItemRead.mutate
  const openItemExternal = useCallback(
    (item: Item) => {
      if (!item.canonicalUrl) return
      window.open(item.canonicalUrl, '_blank', 'noopener')
      if (!item.read) markItemReadMutate({ id: item.id, read: true })
    },
    [markItemReadMutate],
  )

  useEffect(() => {
    if (open) {
      setQ('')
      setIdx(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [open])

  const navCommands: Command[] = useMemo(
    () => [
      { id: 'monitor', label: t('nav.monitor'), hint: '/monitor', run: () => navigate('/monitor') },
      { id: 'today', label: t('nav.today'), hint: '/', run: () => navigate('/') },
      { id: 'feed', label: t('nav.feed'), hint: '/feed', run: () => navigate('/feed') },
      { id: 'watching', label: t('nav.watching'), hint: '/watching', run: () => navigate('/watching') },
      { id: 'actions', label: t('nav.actions'), hint: '/actions', run: () => navigate('/actions') },
      { id: 'settings', label: t('nav.settings'), hint: '/settings', run: () => navigate('/settings') },
      {
        id: 'mark-all-read',
        label: t('feed.markAllRead'),
        hint: t('nav.feed'),
        run: () => {
          void api.markAllRead().then(() => {
            void qc.invalidateQueries({ queryKey: ['feed'] })
            void qc.invalidateQueries({ queryKey: ['unread-counts'] })
            void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
            navigate('/feed')
          })
        },
      },
    ],
    [navigate, t, qc],
  )

  const searchQuery = useQuery({
    queryKey: ['palette-search', q],
    queryFn: () => api.searchItems(q, 8),
    enabled: open && q.trim().length > 1,
  })

  const items: (Command | { id: string; type: 'item'; item: Item })[] = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return navCommands
    const out: (Command | { id: string; type: 'item'; item: Item })[] = []
    for (const cmd of navCommands) {
      if (cmd.label.toLowerCase().includes(query) || (cmd.hint ?? '').toLowerCase().includes(query)) {
        out.push(cmd)
      }
    }
    for (const it of searchQuery.data?.items ?? []) {
      out.push({ id: `item-${it.id}`, type: 'item', item: it })
    }
    return out
  }, [q, navCommands, searchQuery.data])

  useEffect(() => setIdx(0), [q])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Tab') {
        const root = dialogRef.current
        if (!root) return
        const focusable = root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
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
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIdx((i) => Math.min(items.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIdx((i) => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const chosen = items[idx]
        if (!chosen) return
        if ('type' in chosen && chosen.type === 'item') {
          openItemExternal(chosen.item)
          onClose()
        } else {
          ;(chosen as Command).run()
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, items, idx, onClose, openItemExternal])

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [idx])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[10vh]"
      onMouseDown={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.search')}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <span className="text-muted text-sm" aria-hidden>
            ⌘K
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('palette.placeholder')}
            className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
          <kbd>esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto thin-scroll py-2" role="listbox">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">{t('palette.empty')}</p>
          ) : (
            items.map((it, i) => {
              const active = i === idx
              if ('type' in it && it.type === 'item') {
                return (
                  <button
                    key={it.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-idx={i}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => {
                      openItemExternal(it.item)
                      onClose()
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${active ? 'bg-mist/60' : ''}`}
                  >
                    <span className="truncate text-ink">{it.item.title}</span>
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-muted">
                      {it.item.primarySourceType}
                    </span>
                  </button>
                )
              }
              const cmd = it as Command
              return (
                <button
                  key={cmd.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-idx={i}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => {
                    cmd.run()
                    onClose()
                  }}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${active ? 'bg-mist/60' : ''}`}
                >
                  <span className="text-ink">{cmd.label}</span>
                  {cmd.hint ? (
                    <span className="ml-auto font-mono text-[11px] text-muted">{cmd.hint}</span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
