import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AiMonitorInFlight } from '../../lib/api'
import { progressFromElapsed } from './monitorUtils'

/** Live progress bars for in-flight AI calls. */
export function InFlightProgress({
  flights,
  paused,
}: {
  flights: AiMonitorInFlight[]
  paused: boolean
}) {
  const { t } = useTranslation()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const flightIds = flights.map((f) => f.id).join(',')

  useEffect(() => {
    if (!flightIds || paused) return
    const id = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [flightIds, paused])

  if (flights.length === 0) return null

  return (
    <div className="mb-4 grid gap-2">
      {flights.map((flight) => {
        const started = Date.parse(flight.startedAt)
        const liveElapsedMs = Number.isFinite(started)
          ? Math.max(flight.elapsedMs, nowMs - started)
          : flight.elapsedMs
        const liveProgress =
          flight.responseSoFar && flight.responseSoFar.length > 0
            ? Math.min(95, 20 + flight.responseSoFar.length / 20)
            : progressFromElapsed(liveElapsedMs)
        return (
          <div
            key={flight.id}
            className="rounded-xl border border-accent/40 bg-accent/5 px-4 py-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-ink">
                {t('settings.monitorInFlight')}{' '}
                <span className="font-mono text-accent">{flight.operation}</span>
              </p>
              <p className="font-mono text-xs text-muted">
                {(liveElapsedMs / 1000).toFixed(1)}s · {flight.model}
              </p>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(liveProgress)}
              aria-label={t('settings.monitorInFlight')}
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${Math.max(8, liveProgress)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted">{t('settings.monitorLiveHint')}</p>
          </div>
        )
      })}
    </div>
  )
}
