import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { formatRelativeInstant } from '../../lib/format'
import { textLinkClass } from '../../lib/cn'

function StatusDot({ ok, warn }: { ok: boolean; warn?: boolean }) {
  const cls = ok ? 'bg-moss' : warn ? 'bg-ember/70' : 'bg-ember'
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} aria-hidden />
}

function Row({
  label,
  value,
  ok,
  warn,
  hint,
}: {
  label: string
  value: string
  ok: boolean
  warn?: boolean
  hint?: string
}) {
  return (
    <div
      className="flex items-start gap-2 py-1.5"
      role="group"
      aria-label={`${label}: ${value}${hint ? `. ${hint}` : ''}`}
    >
      <span className="mt-1.5">
        <StatusDot ok={ok} warn={warn} />
      </span>
      <div className="min-w-0 flex-1" aria-hidden>
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="text-muted">{label}</span>
          <span className={`font-mono text-xs ${ok ? 'text-moss' : 'text-ember'}`}>{value}</span>
        </div>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
    </div>
  )
}

function ScheduleRow({ label, iso, hint }: { label: string; iso?: string | null; hint?: string }) {
  const { i18n } = useTranslation()
  const rel = formatRelativeInstant(iso)
  const abs = iso ? new Date(iso).toLocaleString(i18n.language) : null
  const value = rel ? `${rel}${abs ? ` · ${abs}` : ''}` : '—'
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="mt-1.5">
        <StatusDot ok={Boolean(iso)} warn={!iso} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="text-muted">{label}</span>
          <span className={`font-mono text-xs ${iso ? 'text-moss' : 'text-ember'}`}>{value}</span>
        </div>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
    </div>
  )
}

/** Compact status strip with optional detail rows. */
export function SystemHealthCard() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const health = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 30_000,
    retry: 1,
  })
  const schedule = useQuery({
    queryKey: ['jobs-schedule'],
    queryFn: api.jobsSchedule,
    refetchInterval: 60_000,
    retry: 1,
  })

  const h = health.data
  const sched = schedule.data
  const translate = h?.translate
  const translateStatus = translate?.status ?? 'unknown'
  const backendOk = health.isSuccess && h?.status === 'ok'
  const dbOk = h?.db === 'up'
  const translateOk = translateStatus === 'up' || translateStatus === 'disabled'
  const llm = h?.llm
  const llmMode = llm?.mode ?? 'unknown'
  const llmOk = llmMode === 'ai'
  const llmValue =
    llmMode === 'ai'
      ? t('settingsHub.healthLlmOk')
      : llmMode === 'heuristic'
        ? t('settingsHub.healthLlmHeuristic')
        : llmMode === 'degraded'
          ? t('settingsHub.healthLlmDegraded')
          : t('settingsHub.healthDown')
  const llmHint =
    llmMode === 'ai'
      ? llm && !llm.successCount && !llm.failureCount
        ? t('settingsHub.healthLlmUntestedHint')
        : [llm?.model, llm?.baseUrl].filter(Boolean).join(' · ')
      : llmMode === 'degraded'
        ? [t('settingsHub.healthLlmFailedHint'), llm?.lastError].filter(Boolean).join(' ')
        : llmMode === 'heuristic'
          ? t('settingsHub.healthLlmNotConfiguredHint')
          : undefined

  const stripOk = backendOk && llmOk
  const stripWarn = backendOk && (llmMode === 'heuristic' || llmMode === 'degraded')
  const healthPending = health.isLoading && !h
  const stripLabel = healthPending
    ? t('settingsHub.healthChecking')
    : health.isError
      ? t('settingsHub.healthDown')
      : llmMode === 'ai'
        ? t('settingsHub.stripAiOn')
        : llmMode === 'degraded'
          ? t('settingsHub.stripAiDegraded')
          : t('settingsHub.stripAiOff')
  const nextFetch = formatRelativeInstant(sched?.nextFetchAt)
  const nextPush = formatRelativeInstant(sched?.nextPushAt)

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="system-health-detail"
        aria-busy={healthPending || undefined}
      >
        {healthPending ? (
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full bg-border animate-pulse motion-reduce:animate-none"
            aria-hidden
          />
        ) : (
          <StatusDot ok={stripOk} warn={stripWarn || !stripOk} />
        )}
        <span className="min-w-0 flex-1 text-ink" aria-live="polite">
          {stripLabel}
        </span>
        {!health.isError && (nextFetch || nextPush) ? (
          <span className="hidden text-xs text-muted sm:inline">
            {[
              nextFetch ? t('settingsHub.stripNextFetch', { time: nextFetch }) : null,
              nextPush ? t('settingsHub.stripNextPush', { time: nextPush }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        ) : null}
        <span className="text-xs text-accent">{open ? t('settingsHub.stripHide') : t('settingsHub.stripShow')}</span>
      </button>

      {open ? (
        <div
          id="system-health-detail"
          role="region"
          aria-label={t('settingsHub.healthTitle')}
          className="border-t border-border px-4 pb-3 pt-1"
        >
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              className="inline-flex min-h-9 items-center rounded-sm px-2 text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-busy={health.isFetching || schedule.isFetching || undefined}
              disabled={health.isFetching || schedule.isFetching}
              onClick={() => {
                void health.refetch()
                void schedule.refetch()
              }}
            >
              {t('settingsHub.healthRefresh')}
            </button>
          </div>

          {health.isLoading ? <p className="text-sm text-muted">{t('common.loading')}</p> : null}
          {health.isError ? (
            <Row
              label={t('settingsHub.healthBackend')}
              value={t('settingsHub.healthDown')}
              ok={false}
              hint={t('settingsHub.healthDownHint')}
            />
          ) : null}

          {h ? (
            <div className="divide-y divide-border/60">
              <Row
                label={t('settingsHub.healthBackend')}
                value={backendOk ? t('settingsHub.healthUp') : t('settingsHub.healthDegraded')}
                ok={backendOk}
              />
              <Row
                label={t('settingsHub.healthLlm')}
                value={llmValue}
                ok={llmOk}
                warn={llmMode === 'heuristic'}
                hint={llmHint}
              />
              <Row
                label={t('settingsHub.healthDb')}
                value={dbOk ? t('settingsHub.healthUp') : t('settingsHub.healthDown')}
                ok={dbOk}
                hint={dbOk ? undefined : h.error}
              />
              <Row
                label={t('settingsHub.healthTranslate')}
                value={
                  translateStatus === 'up'
                    ? t('settingsHub.healthUp')
                    : translateStatus === 'disabled'
                      ? t('settingsHub.healthDisabled')
                      : t('settingsHub.healthDown')
                }
                ok={translateOk}
                warn={translateStatus === 'disabled'}
                hint={
                  translateStatus === 'down'
                    ? t('settingsHub.healthTranslateDownHint')
                    : translateStatus === 'disabled'
                      ? t('settingsHub.healthTranslateDisabledHint')
                      : translate?.baseUrl
                }
              />
              <ScheduleRow
                label={t('settingsHub.healthNextFetch')}
                iso={sched?.nextFetchAt}
                hint={t('settingsHub.healthScheduleHint')}
              />
              <ScheduleRow
                label={t('settingsHub.healthNextPush')}
                iso={sched?.nextPushAt}
                hint={sched?.pushCronError ?? (sched ? `${sched.pushCron} · ${sched.timezone}` : undefined)}
              />
            </div>
          ) : null}

          <p className="mt-3 text-xs text-muted">
            {t('settingsHub.healthCli')}{' '}
            <code className="rounded bg-border/60 px-1 font-mono">./scripts/status.sh</code>
            {' · '}
            <Link to="/settings/preferences" className={`inline-flex min-h-9 items-center ${textLinkClass()}`}>
              {t('settingsHub.preferences')}
            </Link>
            {' · '}
            <Link to="/settings/system" className={`inline-flex min-h-9 items-center ${textLinkClass()}`}>
              {t('nav.monitor')}
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  )
}
