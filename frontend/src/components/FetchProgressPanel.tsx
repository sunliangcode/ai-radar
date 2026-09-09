import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FetchProgress, FetchSourceProgress } from '../lib/api'
import { formatDuration, progressPercent } from '../lib/format'

const COLLECT_STAGES = new Set(['idle', 'fetch'])
const ORGANIZE_STAGES = new Set(['normalize', 'dedup', 'score', 'summarize', 'persist', 'cluster'])
const WRITE_STAGES = new Set(['brief', 'done'])

function beginnerStep(stage: string): 'collect' | 'organize' | 'write' | 'error' {
  if (stage === 'error') return 'error'
  if (WRITE_STAGES.has(stage)) return 'write'
  if (ORGANIZE_STAGES.has(stage)) return 'organize'
  return 'collect'
}

function statusDot(status: FetchSourceProgress['status']): string {
  if (status === 'running') return 'bg-moss animate-pulse'
  if (status === 'done') return 'bg-moss'
  if (status === 'error') return 'bg-ember'
  return 'bg-mist'
}

export function FetchProgressPanel({ progress }: { progress?: FetchProgress }) {
  const { t } = useTranslation()
  const [showDetails, setShowDetails] = useState(false)
  const steps = useMemo(
    () =>
      [
        { id: 'collect' as const, label: t('fetchProgress.step.collect') },
        { id: 'organize' as const, label: t('fetchProgress.step.organize') },
        { id: 'write' as const, label: t('fetchProgress.step.write') },
      ] as const,
    [t],
  )

  if (!progress) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-mist bg-paper/80 px-4 py-6 text-center text-sm text-muted">
        {t('common.fetching')}
      </div>
    )
  }

  const pct = progressPercent(progress)
  const remaining = progress.totals?.remaining ?? 0
  const total = progress.totals?.total ?? 0
  const step = beginnerStep(progress.stage)
  const inFetch = COLLECT_STAGES.has(progress.stage)
  const dimSources = !inFetch && progress.stage !== 'error'
  const stepIndex = step === 'error' ? -1 : steps.findIndex((s) => s.id === step)

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-mist bg-paper/80">
      <div className="border-b border-mist/80 px-4 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-serif text-lg text-ink">
              {step === 'error'
                ? t('fetchProgress.stage.error')
                : t(`fetchProgress.step.${step}`)}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {progress.message ||
                t(`fetchProgress.stage.${progress.stage}`, { defaultValue: progress.stage })}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 font-mono text-xs tabular-nums text-muted">
            <span>{t('fetchProgress.elapsed', { time: formatDuration(progress.elapsedMs) })}</span>
            {inFetch || total > 0 ? (
              <span>{t('fetchProgress.remaining', { remaining, total })}</span>
            ) : null}
          </div>
        </div>

        <ol className="mt-4 flex flex-wrap gap-2">
          {steps.map((s, i) => {
            const active = i === stepIndex
            const done = stepIndex > i
            return (
              <li
                key={s.id}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition duration-200 ${
                  active
                    ? 'bg-moss text-paper'
                    : done
                      ? 'bg-moss/15 text-moss-deep'
                      : 'bg-mist/60 text-muted'
                }`}
              >
                {s.label}
              </li>
            )
          })}
        </ol>
      </div>

      <div
        className="h-1 w-full bg-mist/70"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t(`fetchProgress.step.${step === 'error' ? 'collect' : step}`)}
      >
        <div
          className={`h-full transition-[width] duration-300 ease-out ${
            progress.stage === 'error' ? 'bg-ember' : 'bg-moss'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-end px-4 py-2">
        <button
          type="button"
          className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
          onClick={() => setShowDetails((v) => !v)}
        >
          {showDetails ? t('common.hideDetails') : t('common.showDetails')}
        </button>
      </div>

      {showDetails && progress.sources?.length ? (
        <ul className={`divide-y divide-mist/60 px-2 pb-2 ${dimSources ? 'opacity-55' : ''}`}>
          {progress.sources.map((source) => (
            <li
              key={source.id}
              className={`flex items-center gap-3 px-2 py-2 text-sm ${
                source.status === 'running' ? 'bg-moss/5' : ''
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${statusDot(source.status)}`}
                title={source.status}
                aria-label={source.status}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="truncate font-medium text-ink">{source.name}</span>
                  <span className="font-mono text-[11px] text-muted">{source.type}</span>
                </div>
                {source.status === 'error' && source.error ? (
                  <p className="mt-0.5 truncate text-xs text-ember">{source.error}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right font-mono text-xs tabular-nums text-muted">
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
    </div>
  )
}
