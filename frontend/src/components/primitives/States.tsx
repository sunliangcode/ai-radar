import type { ReactNode } from 'react'
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
  return (
    <div
      role="status"
      className="rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center"
    >
      <h2 className="text-lg font-medium text-ink">{title}</h2>
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

/** Shared load-error + Retry used across Feed / Today / Sources / Radar / Settings. */
export function QueryErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  return (
    <StateBox>
      <div role="alert">
        <p className={onRetry ? 'mb-3' : undefined}>{message}</p>
        {onRetry ? (
          <Button variant="ghost" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        ) : null}
      </div>
    </StateBox>
  )
}
