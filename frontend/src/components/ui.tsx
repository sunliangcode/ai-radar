import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/* ---------------- Theme & density (global, persisted to localStorage) ---------------- */

type Theme = 'light' | 'dark' | 'system'
type Density = 'comfortable' | 'compact' | 'cozy'

const PrefsContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
  density: Density
  setDensity: (d: Density) => void
}>({
  theme: 'system',
  setTheme: () => {},
  density: 'comfortable',
  setDensity: () => {},
})

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('radar-theme') as Theme) || 'system',
  )
  const [density, setDensityState] = useState<Density>(
    () => (localStorage.getItem('radar-density') as Density) || 'comfortable',
  )

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const dark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      root.classList.toggle('dark', dark)
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density)
  }, [density])

  const setTheme = (t: Theme) => {
    localStorage.setItem('radar-theme', t)
    setThemeState(t)
  }
  const setDensity = (d: Density) => {
    localStorage.setItem('radar-density', d)
    setDensityState(d)
  }

  return (
    <PrefsContext.Provider value={{ theme, setTheme, density, setDensity }}>
      {children}
    </PrefsContext.Provider>
  )
}

export function usePrefs() {
  return useContext(PrefsContext)
}

/* ---------------- Toast ---------------- */

type ToastKind = 'success' | 'error'

type ToastAction = {
  label: string
  onClick: () => void
}

type ToastItem = {
  id: number
  kind: ToastKind
  message: string
  action?: ToastAction
}

const ToastContext = createContext<{
  push: (kind: ToastKind, message: string, action?: ToastAction) => void
}>({
  push: () => {},
})

let toastSeq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = (kind: ToastKind, message: string, action?: ToastAction) => {
    const id = ++toastSeq
    setItems((prev) => [...prev, { id, kind, message, action }])
    const ms = kind === 'error' ? 4000 : action ? 6000 : 2500
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, ms)
  }

  const dismiss = (id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(100%-2rem,22rem)] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-3 rounded-md border px-3 py-2 text-sm shadow-lg ${
              item.kind === 'error'
                ? 'border-ember/40 bg-paper text-ember'
                : 'border-moss/40 bg-paper text-moss'
            }`}
          >
            <span className="min-w-0 flex-1">{item.message}</span>
            {item.action ? (
              <button
                type="button"
                className="shrink-0 font-medium underline underline-offset-2 hover:opacity-80"
                onClick={() => {
                  item.action?.onClick()
                  dismiss(item.id)
                }}
              >
                {item.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

/* ---------------- Primitive UI ---------------- */

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-balance text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function StateBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-muted">
      {children}
    </div>
  )
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface px-4 py-4">
          <div className="skeleton h-3.5 w-1/3" />
          <div className="skeleton mt-2.5 h-3 w-5/6" />
          <div className="skeleton mt-2 h-3 w-2/5" />
        </div>
      ))}
    </div>
  )
}

export function useBeforeUnload(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [enabled])
}

export function FormSaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
}: {
  dirty: boolean
  saving?: boolean
  onSave: () => void
  onDiscard: () => void
}) {
  const { t } = useTranslation()
  useBeforeUnload(dirty)
  if (!dirty) return null
  return (
    <div className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-surface/95 px-4 py-3 shadow-lg backdrop-blur">
      <span className="text-sm text-muted">{t('common.unsavedChanges')}</span>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onDiscard} disabled={saving}>
          {t('common.discard')}
        </Button>
        <Button onClick={onSave} loading={saving}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  primary,
  secondary,
}: {
  title: string
  description?: string
  primary?: ReactNode
  secondary?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <h3 className="text-lg font-medium text-ink">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
      {(primary || secondary) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primary}
          {secondary}
        </div>
      )}
    </div>
  )
}

/* ---------------- Confirm dialog ---------------- */

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }
      if (e.key !== 'Tab') return
      const root = dialogRef.current
      if (!root) return
      const focusable = root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea')
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
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl"
      >
        <h3 id="confirm-dialog-title" className="text-base font-medium text-ink">
          {title}
        </h3>
        {description ? <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink hover:bg-mist/50"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              danger
                ? 'border border-red-500/60 text-red-500 hover:bg-red-500/10'
                : 'bg-ink text-paper hover:opacity-90'
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function StatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation()
  if (!status) return null
  return (
    <span className="inline-flex items-center rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-ink">
      {t(`events.status.${status}`, { defaultValue: status })}
    </span>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  loading,
  title,
}: {
  children?: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger' | 'text' | 'icon'
  disabled?: boolean
  type?: 'button' | 'submit'
  loading?: boolean
  title?: string
}) {
  const busy = !!loading
  const styles =
    variant === 'primary'
      ? 'bg-ink text-paper hover:opacity-90'
      : variant === 'danger'
        ? 'border border-red-500/60 text-red-500 hover:bg-red-500/10'
        : variant === 'text'
          ? 'bg-transparent text-muted hover:text-ink underline-offset-2 hover:underline'
          : variant === 'icon'
            ? 'h-8 w-8 inline-flex items-center justify-center rounded-md text-muted hover:bg-mist/60 hover:text-ink'
            : 'border border-border bg-surface text-ink hover:bg-mist/50'
  return (
    <button
      type={type}
      disabled={disabled || busy}
      onClick={onClick}
      title={title}
      aria-busy={busy || undefined}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {loading ? (
        <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" aria-hidden />
      ) : null}
      {children}
    </button>
  )
}

/** Legacy score pill kept for older pages. */
export function ScorePill({ score }: { score?: number }) {
  if (score == null) return <span className="font-mono text-xs text-muted tabular-nums">—</span>
  return (
    <span className="inline-flex min-w-10 items-center justify-center rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums text-ink">
      {Math.round(score)}
    </span>
  )
}

/**
 * Honest, explainable score meter. Shows the number plus a bar, and labels
 * whether the score came from rules (rule) or an LLM (ai).
 */
export function ScoreBar({
  score,
  source,
  reason,
  size = 'md',
}: {
  score?: number
  source?: 'rule' | 'ai' | 'unknown'
  reason?: string
  size?: 'sm' | 'md'
}) {
  const value = score == null ? 0 : Math.max(0, Math.min(100, score))
  const cls = value >= 70 ? '' : value >= 45 ? 'medium' : 'low'
  return (
    <div className="flex flex-col gap-1" title={reason ?? ''}>
      <div className="flex items-center gap-2">
        <span className={`font-mono font-semibold tabular-nums ${size === 'sm' ? 'text-xs' : 'text-sm'} text-ink`}>
          {Math.round(value)}
        </span>
        <ScoreSourceBadge source={source} />
      </div>
      <div className={`score-bar ${cls} ${size === 'sm' ? 'w-10' : 'w-14'}`}>
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export function ScoreSourceBadge({ source }: { source?: 'rule' | 'ai' | 'unknown' }) {
  const { t } = useTranslation()
  if (!source || source === 'unknown') return null
  const cls =
    source === 'ai'
      ? 'border-accent/40 bg-accent/10 text-accent'
      : 'border-border bg-surface text-muted'
  return (
    <span className={`inline-flex items-center rounded-sm border px-1 py-px text-[10px] font-medium ${cls}`}>
      {source === 'ai' ? t('score.ai') : t('score.rule')}
    </span>
  )
}

/** Legacy row kept for old pages; new feed uses FeedRow. */
export function ItemRow({
  title,
  score,
  summary,
  contentSnippet,
  url,
  meta,
  unread,
  saved,
  onMarkRead,
  onToggleSaved,
}: {
  title: string
  score?: number
  summary?: string
  contentSnippet?: string
  url: string
  meta?: string
  unread?: boolean
  saved?: boolean
  onMarkRead?: () => void
  onToggleSaved?: () => void
}) {
  const { t } = useTranslation()
  const body = (contentSnippet && contentSnippet.trim()) || (summary && summary.trim()) || ''
  return (
    <article className={`row-py border-b border-border/70 last:border-0 ${unread ? '' : 'opacity-70'}`}>
      <div className="flex items-start gap-3">
        <ScorePill score={score} />
        <div className="min-w-0 flex-1">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-ink transition duration-150 hover:underline"
          >
            {title}
          </a>
          {body ? <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">{body}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
            {meta ? <span className="font-mono">{meta}</span> : null}
            {onToggleSaved ? (
              <button type="button" className="underline hover:text-ink" onClick={onToggleSaved}>
                {saved ? t('common.unsaveInterest') : t('common.saveInterest')}
              </button>
            ) : null}
            {onMarkRead && unread ? (
              <button type="button" className="underline hover:text-ink" onClick={onMarkRead}>
                {t('common.markRead')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
