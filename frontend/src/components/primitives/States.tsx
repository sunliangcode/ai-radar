import type { ReactNode } from 'react'
import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'

export function StateBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-muted">
      {children}
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
  const titleId = useId()
  const descId = useId()
  // tabIndex=-1 so callers can programmatically focus; do not autofocus —
  // empty states often appear mid-interaction (e.g. filter chips) and must not steal focus.
  return (
    <div
      role="status"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className="rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center"
    >
      <h2 id={titleId} tabIndex={-1} className="text-lg font-medium text-ink outline-none">
        {title}
      </h2>
      {description ? (
        <p id={descId} className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
      {(primary || secondary) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3" role="group" aria-label={title}>
          {primary}
          {secondary}
        </div>
      )}
    </div>
  )
}

/** Shared load-error + Retry used across Feed / Today / Sources / Radar / Settings. */
export function QueryErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const msgId = useId()
  const retryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Focus once when the error UI mounts — not when parent re-creates onRetry.
    retryRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <StateBox>
      <div role="alert" aria-labelledby={msgId} aria-live="assertive">
        <p id={msgId} className={onRetry ? 'mb-3' : undefined}>
          {message}
        </p>
        {onRetry ? (
          <Button
            ref={retryRef}
            variant="ghost"
            onClick={onRetry}
            aria-label={t('common.retry')}
          >
            {t('common.retry')}
          </Button>
        ) : null}
      </div>
    </StateBox>
  )
}
