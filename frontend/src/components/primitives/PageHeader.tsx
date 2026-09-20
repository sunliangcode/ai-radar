import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '../../lib/cn'

const backLinkClass =
  'inline-flex min-h-9 items-center gap-1.5 rounded-sm text-sm text-muted transition motion-reduce:transition-none hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg'

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  /** Consistent back control above the title (link or button). */
  back?: { label: string; to?: string; onClick?: () => void }
}) {
  const backControl = back ? (
    back.to ? (
      <Link to={back.to} className={backLinkClass} aria-label={back.label}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {back.label}
      </Link>
    ) : (
      <button type="button" onClick={back.onClick} className={backLinkClass} aria-label={back.label}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {back.label}
      </button>
    )
  ) : null

  return (
    <header className="mb-6">
      {backControl ? <div className="mb-2">{backControl}</div> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-balance text-ink">{title}</h1>
          {subtitle ? (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className={cn('flex flex-wrap items-center gap-2')} role="group" aria-label={title}>
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  )
}
