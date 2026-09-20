import { useEffect, useId, useRef } from 'react'
import { useFocusTrap } from '../layout/useFocusTrap'
import { Button } from './Button'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger,
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  /** Disables both buttons while the confirmed action is in flight, preventing double submits. */
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  // Destructive confirms focus Cancel first (safer default); others focus Confirm.
  const initialFocusRef = danger ? cancelRef : confirmRef

  useFocusTrap({
    open,
    onClose: () => {
      if (!pending) onCancel()
    },
    containerRef: dialogRef,
    initialFocusRef,
  })

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-[1px] motion-reduce:backdrop-blur-none"
      onMouseDown={(e) => {
        if (pending) return
        if (e.target === e.currentTarget) onCancel()
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role={danger ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        aria-busy={pending || undefined}
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl"
      >
        <h3 id={titleId} className="text-base font-medium text-ink">
          {title}
        </h3>
        {description ? (
          <p id={descId} className="mt-2 text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2" role="group" aria-label={title}>
          <Button ref={cancelRef} variant="ghost" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={danger ? 'danger' : 'primary'}
            loading={pending}
            disabled={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
