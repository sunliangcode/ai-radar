import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api, type Item } from '../lib/api'
import { errorText } from '../lib/errors'
import { formatPushResult, type PushResultBody } from '../lib/formatPushResult'
import { useMarkItemRead } from '../hooks/useMarkItemRead'
import { useDisplaySources } from '../hooks/useDisplaySources'
import { useFocusTrap } from './layout/useFocusTrap'
import { useToast } from './ui'

type Command = {
  id: string
  label: string
  hint?: string
  /** Return false to keep the palette open (e.g. arm a two-step confirm). */
  run: () => boolean | void | Promise<unknown>
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const markItemRead = useMarkItemRead()
  const { sourceIdsQuery } = useDisplaySources()
  const { push: pushToast } = useToast()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  // Bulk "mark all read" is destructive; arm it with a first Enter, execute on the second.
  const [armed, setArmed] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useFocusTrap({ open, onClose, containerRef: dialogRef, initialFocusRef: inputRef })

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
      returnFocusRef.current = document.activeElement as HTMLElement | null
      setQ('')
      setIdx(0)
      setArmed(null)
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

  const runAndMaybeClose = useCallback(
    (run: () => boolean | void | Promise<unknown>) => {
      const keepOpen = run() === false
      if (!keepOpen) onClose()
    },
    [onClose],
  )

  const navCommands: Command[] = useMemo(
    () => [
      { id: 'today', label: t('nav.today'), hint: '/', run: () => navigate('/') },
      { id: 'radar', label: t('nav.radar'), hint: '/radar', run: () => navigate('/radar') },
      { id: 'decisions', label: t('nav.decisions'), hint: '/decisions', run: () => navigate('/decisions') },
      { id: 'chat', label: t('nav.chat'), hint: '/chat', run: () => navigate('/chat') },
      { id: 'actions', label: t('nav.actions'), hint: '/actions', run: () => navigate('/actions') },
      {
        id: 'sources',
        label: t('nav.sources'),
        hint: '/settings/sources',
        run: () => navigate('/settings/sources'),
      },
      { id: 'settings', label: t('nav.settings'), hint: '/settings', run: () => navigate('/settings') },
      { id: 'briefs', label: t('nav.briefs'), hint: '/briefs', run: () => navigate('/briefs') },
      { id: 'monitor', label: t('nav.monitor'), hint: '/settings/system', run: () => navigate('/settings/system') },
      {
        id: 'push-now',
        label: t('common.pushNow'),
        hint: t('palette.jobs'),
        run: () => {
          void api
            .pushJob()
            .then((body) => {
              const result = body as PushResultBody
              const failed = (result.results ?? []).some((r) => r.success === false && !r.skipped)
              pushToast(failed ? 'error' : 'success', formatPushResult(result, t))
            })
            .catch((err) => pushToast('error', t('common.loadFailed', { message: errorText(err, t) })))
        },
      },
      {
        id: 'impact-now',
        label: t('today.recomputeImpact'),
        hint: t('palette.jobs'),
        run: () => {
          void api
            .impactJob()
            .then(() => pushToast('success', t('today.impactDone')))
            .catch((err) => pushToast('error', t('common.loadFailed', { message: errorText(err, t) })))
        },
      },
      {
        id: 'mark-all-read',
        label: armed === 'mark-all-read' ? t('feed.markAllReadConfirm') : t('feed.markAllRead'),
        hint: armed === 'mark-all-read' ? t('common.confirm') : t('nav.radar'),
        run: () => {
          if (armed !== 'mark-all-read') {
            setArmed('mark-all-read')
            return false
          }
          setArmed(null)
          void api
            .markAllRead()
            .then(() => {
              void qc.invalidateQueries({ queryKey: ['feed'] })
              void qc.invalidateQueries({ queryKey: ['unread-counts'] })
              void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
              navigate('/radar?view=signals')
              pushToast('success', t('feed.markAllReadDone'))
            })
            .catch((err) => pushToast('error', t('common.loadFailed', { message: errorText(err, t) })))
        },
      },
    ],
    [armed, navigate, pushToast, qc, t],
  )

  const searchQuery = useQuery({
    queryKey: ['palette-search', q, sourceIdsQuery],
    queryFn: () => {
      const ids = sourceIdsQuery ? sourceIdsQuery.replace(/^sourceIds=/, '') : undefined
      return api.searchItems(q, 8, ids)
    },
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
      if (e.key === 'ArrowDown') {
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
          runAndMaybeClose((chosen as Command).run)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, items, idx, onClose, openItemExternal, runAndMaybeClose])

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [idx])

  if (!open) return null

  const activeOptionId = items.length ? `palette-opt-${idx}` : undefined

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-3 pb-[env(safe-area-inset-bottom)] pt-[max(10vh,env(safe-area-inset-top))] backdrop-blur-[1px] motion-reduce:backdrop-blur-none"
      onMouseDown={onClose}
      role="presentation"
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
            role="combobox"
            aria-expanded="true"
            aria-haspopup="listbox"
            aria-controls="palette-listbox"
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
          {q ? (
            <button
              type="button"
              aria-label={t('feed.clearSearch')}
              onClick={() => {
                setQ('')
                setIdx(0)
                inputRef.current?.focus()
              }}
              className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-border hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <span aria-hidden>×</span>
            </button>
          ) : null}
          <kbd aria-hidden>esc</kbd>
        </div>
        <div
          id="palette-listbox"
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto thin-scroll py-2"
          role="listbox"
          aria-label={t('nav.search')}
          aria-busy={searchQuery.isFetching || undefined}
        >
          {searchQuery.isFetching && items.length === 0 && q.trim().length > 1 ? (
            <p className="px-4 py-6 text-sm text-muted" role="status">
              {t('common.loading')}
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted" role="status">
              {t('palette.empty')}
            </p>
          ) : (
            items.map((it, i) => {
              const active = i === idx
              const optionId = `palette-opt-${i}`
              if ('type' in it && it.type === 'item') {
                return (
                  <button
                    key={it.id}
                    id={optionId}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-idx={i}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => {
                      openItemExternal(it.item)
                      onClose()
                    }}
                    className={`flex min-h-10 w-full items-center gap-2 px-4 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40 ${active ? 'bg-border/60' : ''}`}
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
                  id={optionId}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-idx={i}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => runAndMaybeClose(cmd.run)}
                  className={`flex min-h-10 w-full items-center gap-2 px-4 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40 ${active ? 'bg-border/60' : ''}`}
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
