import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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
