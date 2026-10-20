import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ListSkeleton, PageHeader, QueryErrorState } from '../components/ui'
import { useEscapeBack } from '../hooks/useEscapeBack'
import { useAiMonitorStream } from './monitor/useAiMonitorStream'
import { buildIoEntries } from './monitor/monitorUtils'
import { MonitorQueueCard } from './monitor/MonitorQueueCard'
import { LiveConsole } from './monitor/LiveConsole'
import { InFlightProgress } from './monitor/InFlightProgress'
import { MonitorStatsCard } from './monitor/MonitorStatsCard'
import { errorText } from '../lib/errors'

export default function AiMonitorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { monitor, mon, inFlights, sseLive, paused, setPaused } = useAiMonitorStream()
  const [opFilter, setOpFilter] = useState('')

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/settings')
  }, [navigate])
  useEscapeBack(goBack)

  const queue = mon?.queue
  const operations = (() => {
    const set = new Set<string>()
    for (const r of mon?.recent ?? []) set.add(r.operation)
    for (const f of inFlights) set.add(f.operation)
    return Array.from(set).sort()
  })()

  const filteredRecent = opFilter
    ? (mon?.recent ?? []).filter((r) => r.operation === opFilter)
    : mon?.recent ?? []
  const filteredFlights = opFilter ? inFlights.filter((f) => f.operation === opFilter) : inFlights
  const ioEntries = buildIoEntries(filteredFlights, filteredRecent)
  const streamLen = inFlights.reduce((n, f) => n + (f.responseSoFar?.length ?? 0), 0)
  const pageBusy =
    monitor.isLoading || monitor.isFetching || (filteredFlights.length > 0 && !paused) || undefined

  return (
    <div aria-busy={pageBusy || undefined}>
      <PageHeader
        titleId="ai-monitor-heading"
        title={t('nav.monitor')}
        subtitle={t('settings.monitorHint')}
        back={{ label: t('common.backToList'), onClick: goBack }}
      />
      {monitor.isLoading ? <ListSkeleton rows={5} /> : null}
      {monitor.isError ? (
        <QueryErrorState
          message={t('common.loadFailed', { message: errorText(monitor.error, t) })}
          onRetry={() => void monitor.refetch()}
        />
      ) : null}
      {!monitor.isLoading && !monitor.isError ? (
        <>
          <p className="mb-4 text-xs text-muted">
            {t('settings.monitorOpenSettings')}{' '}
            <code className="rounded bg-border/60 px-1 font-mono">OPENAI_*</code>
            {' '}
            {t('settings.monitorEnvHint')}
            {sseLive ? (
              <span className="ml-2 text-moss" role="status" aria-live="polite">
                {t('settings.monitorStreaming')}
              </span>
            ) : (
              <span className="ml-2 text-muted" role="status" aria-live="polite">
                {t('settings.monitorSseOff')}
              </span>
            )}
          </p>

          {queue && (queue.itemsTotal ?? 0) > 0 ? <MonitorQueueCard queue={queue} /> : null}

          <LiveConsole
            ioEntries={ioEntries}
            inFlightCount={filteredFlights.length}
            streamLen={streamLen}
            operations={operations}
            opFilter={opFilter}
            onOpFilterChange={setOpFilter}
            paused={paused}
            onTogglePause={() => setPaused((v) => !v)}
          />

          <InFlightProgress flights={filteredFlights} paused={paused} />

          {mon && mon.callCount > 0 ? (
            <MonitorStatsCard mon={mon} filteredRecent={filteredRecent} />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
