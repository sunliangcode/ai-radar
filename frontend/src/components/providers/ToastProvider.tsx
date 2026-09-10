import { createContext, useContext, useState, type ReactNode } from 'react'

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
                ? 'border-ember/40 bg-surface text-ember'
                : 'border-moss/40 bg-surface text-moss'
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
