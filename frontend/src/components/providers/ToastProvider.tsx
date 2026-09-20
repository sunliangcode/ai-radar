import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/* Toast */

export type ToastKind = 'success' | 'error'

export type ToastAction = {
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

function toastDuration(kind: ToastKind, hasAction: boolean) {
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const base = kind === 'error' ? 5000 : hasAction ? 6000 : 2500
  return reduce ? Math.round(base * 1.6) : base
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [items, setItems] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<number, number>>(new Map())

  const clearTimer = (id: number) => {
    const handle = timersRef.current.get(id)
    if (handle != null) {
      window.clearTimeout(handle)
      timersRef.current.delete(id)
    }
  }

  const scheduleDismiss = (id: number, ms: number) => {
    clearTimer(id)
    const handle = window.setTimeout(() => {
      timersRef.current.delete(id)
      setItems((prev) => prev.filter((toast) => toast.id !== id))
    }, ms)
    timersRef.current.set(id, handle)
  }

  const dismiss = (id: number) => {
    clearTimer(id)
    setItems((prev) => prev.filter((toast) => toast.id !== id))
  }

  useEffect(() => {
    if (items.length === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Let modals / palette own Escape first.
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      const top = items[items.length - 1]
      if (!top) return
      e.preventDefault()
      dismiss(top.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items])

  useEffect(() => {
    return () => {
      for (const handle of timersRef.current.values()) {
        window.clearTimeout(handle)
      }
      timersRef.current.clear()
    }
  }, [])

  const push = (kind: ToastKind, message: string, action?: ToastAction) => {
    const id = ++toastSeq
    setItems((prev) => {
      const next = [...prev, { id, kind, message, action }]
      if (next.length <= 3) return next
      const kept = next.slice(next.length - 3)
      for (const dropped of next.slice(0, next.length - 3)) {
        clearTimer(dropped.id)
      }
      return kept
    })
    scheduleDismiss(id, toastDuration(kind, Boolean(action)))
  }

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[60] flex w-[min(100%-2rem,22rem)] flex-col gap-2"
        role="region"
        aria-label={t('common.toasts')}
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.kind === 'error' ? 'alert' : 'status'}
            aria-live={item.kind === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            onMouseEnter={() => clearTimer(item.id)}
            onMouseLeave={() =>
              scheduleDismiss(item.id, toastDuration(item.kind, Boolean(item.action)))
            }
            onFocusCapture={() => clearTimer(item.id)}
            onBlurCapture={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                scheduleDismiss(item.id, toastDuration(item.kind, Boolean(item.action)))
              }
            }}
            className={`pointer-events-auto flex items-center gap-3 rounded-md border px-3 py-2 text-sm shadow-lg ${
              item.kind === 'error'
                ? 'border-ember/40 bg-surface text-ember'
                : 'border-moss/40 bg-surface text-moss'
            }`}
          >
            <span className="min-w-0 flex-1">{item.message}</span>
            {item.action ? (
              <button
                type="button"
                className="inline-flex min-h-9 shrink-0 items-center rounded-sm px-1 font-medium underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                onClick={() => {
                  item.action?.onClick()
                  dismiss(item.id)
                }}
              >
                {item.action.label}
              </button>
            ) : null}
            <button
              type="button"
              className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-sm text-xs text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label={t('common.dismiss')}
              onClick={() => dismiss(item.id)}
            >
              <span aria-hidden>✕</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
