import { useTranslation } from 'react-i18next'
import type { FetchProgress, FetchSourceProgress } from '../lib/api'
import { Button } from './ui'

function formatDuration(ms?: number | null): string {
  if (ms == null || Number.isNaN(ms)) return '—'
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`
  const sec = ms / 1000
  if (sec < 60) return `${sec.toFixed(1)}s`
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function statusDot(status: FetchSourceProgress['status']): string {
  if (status === 'done') return 'bg-moss'
  if (status === 'error') return 'bg-ember'
  return 'bg-mist'
}

export function FetchResultSummary({
  progress,
  onDismiss,
}: {
  progress?: FetchProgress
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  if (!progress) return null

  const failed = progress.sources?.filter((s) => s.status === 'error') ?? []
  const failedCount = failed.length
  const isError = progress.stage === 'error'
  const result = progress.result
  const title = isError
    ? t('fetchProgress.summary.titleError')
    : t('fetchProgress.summary.titleDone')

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-mist bg-paper/90">
      <div className="border-b border-mist/80 px-5 py-5">
        <h3 className="font-serif text-2xl text-ink">{title}</h3>
        <p className="mt-2 font-mono text-sm text-muted">
          {t('fetchProgress.summary.overview', {
            fetched: result?.fetched ?? progress.sources?.reduce((n, s) => n + (s.itemCount ?? 0), 0) ?? 0,
            kept: result?.kept ?? 0,
            time: formatDuration(result?.durationMs ?? progress.elapsedMs),
          })}
        </p>
        {failedCount > 0 ? (
          <p className="mt-1 text-sm text-ember">
            {t('fetchProgress.summary.failedCount', { count: failedCount })}
          </p>
        ) : null}
        {isError && progress.error ? (
          <p className="mt-2 text-sm text-ember">{progress.error}</p>
        ) : null}
      </div>

      {progress.sources?.length ? (
        <ul className="divide-y divide-mist/70">
          {progress.sources.map((source) => (
            <li key={source.id} className="flex items-start gap-3 px-5 py-3.5">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDot(source.status)}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-ink">{source.name}</span>
                  <span className="font-mono text-[11px] text-muted">{source.type}</span>
                </div>
                {source.status === 'error' && source.error ? (
                  <p className="mt-1 text-xs text-ember">{source.error}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right font-mono text-xs text-muted">
                {source.status === 'error' ? (
                  <span className="text-ember">{t('fetchProgress.summary.failed')}</span>
                ) : (
                  <span>
                    {t('fetchProgress.summary.items', { count: source.itemCount ?? 0 })}
                    <span className="mx-1.5 text-mist">·</span>
                    {formatDuration(source.durationMs)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-sm text-muted">{t('fetchProgress.summary.noSources')}</p>
      )}

      <div className="flex justify-end border-t border-mist/80 px-5 py-4">
        <Button onClick={onDismiss}>{t('fetchProgress.summary.dismiss')}</Button>
      </div>
    </div>
  )
}
