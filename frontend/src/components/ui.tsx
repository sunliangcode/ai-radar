import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-balance text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function StateBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-mist bg-paper/60 px-5 py-10 text-center text-sm text-muted">
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
    <div className="rounded-xl border border-dashed border-mist bg-paper/70 px-6 py-12 text-center">
      <h3 className="font-serif text-xl text-ink">{title}</h3>
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

export function StatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation()
  if (!status) return null
  const label = t(`events.status.${status}`, { defaultValue: status })
  return (
    <span className="inline-flex items-center rounded-sm border border-mist px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-ink bg-paper">
      {label}
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
  'aria-busy': ariaBusy,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger' | 'text'
  disabled?: boolean
  type?: 'button' | 'submit'
  loading?: boolean
  'aria-busy'?: boolean
}) {
  const busy = loading || ariaBusy
  const styles =
    variant === 'primary'
      ? 'bg-ink text-paper hover:bg-moss-deep'
      : variant === 'danger'
        ? 'border border-ink bg-ink text-paper hover:bg-moss-deep'
        : variant === 'text'
          ? 'bg-transparent text-ink underline-offset-2 hover:underline'
          : 'border border-mist bg-paper text-ink hover:bg-mist'
  return (
    <button
      type={type}
      disabled={disabled || busy}
      onClick={onClick}
      aria-busy={busy || undefined}
      className={`rounded-sm px-3 py-2 text-sm font-medium tracking-wide transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  )
}

export function ScorePill({ score }: { score?: number }) {
  if (score == null) return <span className="font-mono text-xs text-muted tabular-nums">—</span>
  return (
    <span className="inline-flex min-w-10 items-center justify-center rounded-sm border border-mist bg-paper px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-ink">
      {Math.round(score)}
    </span>
  )
}

export function ItemRow({
  title,
  score,
  summary,
  contentSnippet,
  url,
  meta,
  unread,
  onMarkRead,
}: {
  title: string
  score?: number
  summary?: string
  contentSnippet?: string
  url: string
  meta?: string
  unread?: boolean
  onMarkRead?: () => void
}) {
  const body = (contentSnippet && contentSnippet.trim()) || (summary && summary.trim()) || ''
  return (
    <article
      className={`border-b border-mist/80 py-4 last:border-0 ${unread ? '' : 'opacity-70'}`}
    >
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
          {body ? (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">{body}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
            {meta ? <span className="font-mono">{meta}</span> : null}
            {onMarkRead && unread ? (
              <MarkReadButton onClick={onMarkRead} />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}

function MarkReadButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button type="button" className="underline hover:text-ink" onClick={onClick}>
      {t('common.markRead')}
    </button>
  )
}
