import { useTranslation } from 'react-i18next'
import type { FetchProgress, FetchSourceProgress } from '../lib/api'

const POST_FETCH_STAGES = new Set([
  'normalize',
  'dedup',
  'score',
  'summarize',
  'persist',
  'cluster',
  'brief',
  'done',
  'error',
])

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
  if (status === 'running') return 'bg-moss animate-pulse'
  if (status === 'done') return 'bg-moss'
  if (status === 'error') return 'bg-ember'
  return 'bg-mist'
}

function progressPercent(progress: FetchProgress): number {
  const { stage, totals } = progress
  if (stage === 'done') return 100
  if (stage === 'error') return Math.min(99, stageWeight(stage))
  if (stage === 'fetch' || stage === 'idle') {
    if (totals.total <= 0) return 5
    return Math.min(55, Math.round((totals.done / totals.total) * 55))
  }
  return stageWeight(stage)
}

function stageWeight(stage: string): number {
  const order = [
    'fetch',
    'normalize',
    'dedup',
    'score',
    'summarize',
    'persist',
    'cluster',
    'brief',
    'done',
  ]
  const idx = order.indexOf(stage)
  if (idx < 0) return 10
  return Math.round(((idx + 1) / order.length) * 100)
}

export function FetchProgressPanel({ progress }: { progress?: FetchProgress }) {
  const { t } = useTranslation()
  if (!progress) return null

  const pct = progressPercent(progress)
  const remaining = progress.totals?.remaining ?? 0
  const total = progress.totals?.total ?? 0
  const inFetch = progress.stage === 'fetch' || progress.stage === 'idle'
  const dimSources = POST_FETCH_STAGES.has(progress.stage) && progress.stage !== 'error'
  const result = progress.result

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-mist bg-paper/80">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-mist/80 px-4 py-3">
        <div>
          <p className="font-serif text-base text-ink">
            {t(`fetchProgress.stage.${progress.stage}`, { defaultValue: progress.stage })}
          </p>
          {progress.message ? (
            <p className="mt-0.5 text-xs text-muted">{progress.message}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-4 font-mono text-xs text-muted">
          <span>{t('fetchProgress.elapsed', { time: formatDuration(progress.elapsedMs) })}</span>
          {inFetch || total > 0 ? (
            <span>{t('fetchProgress.remaining', { remaining, total })}</span>
          ) : null}
        </div>
      </div>

      <div className="h-1 w-full bg-mist/70">
        <div
          className={`h-full transition-[width] duration-300 ease-out ${
            progress.stage === 'error' ? 'bg-ember' : 'bg-moss'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {progress.sources?.length ? (
        <ul className={`divide-y divide-mist/60 px-2 py-1 ${dimSources ? 'opacity-55' : ''}`}>
          {progress.sources.map((source) => (
            <li
              key={source.id}
              className={`flex items-center gap-3 px-2 py-2 text-sm ${
                source.status === 'running' ? 'bg-moss/5' : ''
              }`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(source.status)}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="truncate font-medium text-ink">{source.name}</span>
                  <span className="font-mono text-[11px] text-muted">{source.type}</span>
                </div>
                {source.status === 'error' && source.error ? (
                  <p className="mt-0.5 truncate text-xs text-ember">{source.error}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right font-mono text-xs text-muted">
                {source.status === 'pending' ? (
                  <span>{t('fetchProgress.pending')}</span>
                ) : source.status === 'running' ? (
                  <span>{formatDuration(source.durationMs)}</span>
                ) : source.status === 'done' ? (
                  <span>
                    {formatDuration(source.durationMs)}
                    {source.itemCount != null ? ` · ${source.itemCount}` : ''}
                  </span>
                ) : (
                  <span className="text-ember">{formatDuration(source.durationMs)}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {progress.stage === 'done' && result ? (
        <p className="border-t border-mist/80 px-4 py-2.5 font-mono text-xs text-moss-deep">
          {t('fetchProgress.doneStats', {
            fetched: result.fetched ?? 0,
            kept: result.kept ?? 0,
            time: formatDuration(result.durationMs ?? progress.elapsedMs),
          })}
        </p>
      ) : null}

      {progress.stage === 'error' && progress.error ? (
        <p className="border-t border-mist/80 px-4 py-2.5 text-xs text-ember">{progress.error}</p>
      ) : null}
    </div>
  )
}
