import { useQuery } from '@tanstack/react-query'
import { Fragment, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type AiMonitorCall, type AiMonitorInFlight } from '../lib/api'
import { formatAiMonitorBody } from '../lib/formatAiMonitorBody'
import { PageHeader, StateBox } from '../components/ui'

function formatTps(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—'
  return v >= 100 ? v.toFixed(0) : v.toFixed(1)
}

/** Soft progress from elapsed ms — matches backend asymptote toward 90%. */
function progressFromElapsed(elapsedMs: number): number {
  return Math.min(90, 90 * (1 - Math.exp(-elapsedMs / 15_000)))
}

function formatClock(iso: string): string {
  const d = Date.parse(iso)
  if (!Number.isFinite(d)) return iso.slice(11, 19) || iso
  // Backend Instant is UTC; display in Asia/Shanghai (UTC+8)
  return new Date(d).toLocaleTimeString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

type IoEntry = {
  key: string
  kind: 'input' | 'output'
  operation: string
  at: string
  body: string
  pending?: boolean
  streaming?: boolean
  ok?: boolean
  error?: string | null
}

function buildIoEntries(inFlights: AiMonitorInFlight[], recent: AiMonitorCall[]): IoEntry[] {
  const entries: IoEntry[] = []
  // Oldest completed first for chronological scroll
  const completed = [...recent].reverse()
  for (const row of completed) {
    entries.push({
      key: `in-${row.ts}-${row.operation}`,
      kind: 'input',
      operation: row.operation,
      at: row.ts,
      body: row.promptPreview || '—',
    })
    entries.push({
      key: `out-${row.ts}-${row.operation}`,
      kind: 'output',
      operation: row.operation,
      at: row.ts,
      body: row.responsePreview || row.error || '—',
      ok: row.ok,
      error: row.error,
    })
  }
  for (const flight of inFlights) {
    entries.push({
      key: `inflight-in-${flight.id}`,
      kind: 'input',
      operation: flight.operation,
      at: flight.startedAt,
      body: flight.promptPreview || '—',
      pending: true,
    })
    if (flight.responseSoFar) {
      entries.push({
        key: `inflight-out-${flight.id}`,
        kind: 'output',
        operation: flight.operation,
        at: flight.startedAt,
        body: flight.responseSoFar,
        pending: true,
        streaming: true,
      })
    } else {
      entries.push({
        key: `inflight-out-wait-${flight.id}`,
        kind: 'output',
        operation: flight.operation,
        at: flight.startedAt,
        body: '',
        pending: true,
        streaming: false,
      })
    }
  }
  return entries
}

function MonitorBubble({
  entry,
  showRaw,
  onToggleRaw,
}: {
  entry: IoEntry
  showRaw: boolean
  onToggleRaw: () => void
}) {
  const { t } = useTranslation()
  const isInput = entry.kind === 'input'
  // Input: show prompt raw (same as「查看原始」). Output: conversational format.
  const formatted = isInput
    ? null
    : formatAiMonitorBody(entry.body || (entry.pending ? '' : '—'), {
        kind: entry.kind,
        operation: entry.operation,
      })
  const rawText = entry.body || (entry.pending ? '' : '—')
  const displayText =
    entry.pending && !entry.body
      ? ''
      : isInput
        ? rawText
        : formatted?.text || (entry.pending ? '' : '—')

  return (
    <div
      className={`mb-4 flex ${isInput ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[min(92%,36rem)] ${
          isInput ? 'items-end' : 'items-start'
        } flex flex-col gap-1`}
      >
        <div className="flex flex-wrap items-baseline gap-2 px-1">
          <span
            className={
              isInput
                ? 'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-moss/25 text-moss'
                : entry.ok === false
                  ? 'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-ember/20 text-ember'
                  : 'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-accent/15 text-accent'
            }
          >
            {isInput ? t('settings.monitorYou') : t('settings.monitorAssistant')}
          </span>
          <span className="font-mono text-[11px] text-muted">{entry.operation}</span>
          <span className="text-[11px] text-muted/70">{formatClock(entry.at)}</span>
          {entry.pending ? (
            <span className="animate-pulse text-[11px] text-accent">
              {entry.streaming
                ? t('settings.monitorIoStreaming')
                : t('settings.monitorIoWaiting')}
            </span>
          ) : null}
        </div>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isInput
              ? 'rounded-br-md bg-mist/80 text-ink'
              : entry.ok === false
                ? 'rounded-bl-md border border-ember/30 bg-ember/5 text-ink'
                : 'rounded-bl-md border border-mist bg-paper text-ink shadow-sm'
          }`}
        >
          {entry.pending && !entry.body ? (
            <span className="inline-flex items-center gap-1 text-muted" aria-label={t('settings.monitorIoWaiting')}>
              <span className="monitor-cursor" aria-hidden />
            </span>
          ) : isInput ? (
            <pre className="max-h-[min(40vh,20rem)] overflow-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-ink">
              {displayText}
            </pre>
          ) : (
            <div className="prose-monitor">
              <ReactMarkdown>{displayText}</ReactMarkdown>
              {entry.streaming ? <span className="monitor-cursor" aria-hidden /> : null}
            </div>
          )}
        </div>
        {!isInput && entry.body && entry.body !== '—' ? (
          <button
            type="button"
            className="px-1 text-[11px] text-muted underline-offset-2 hover:text-accent hover:underline"
            onClick={onToggleRaw}
          >
            {showRaw ? t('settings.monitorHideRaw') : t('settings.monitorShowRaw')}
          </button>
        ) : null}
        {!isInput && showRaw && entry.body ? (
          <pre className="max-h-40 w-full overflow-auto whitespace-pre-wrap rounded-lg border border-mist bg-paper/90 p-2 font-mono text-[11px] text-muted">
            {entry.body}
          </pre>
        ) : null}
      </div>
    </div>
  )
}

function HistoryBody({
  kind,
  operation,
  body,
}: {
  kind: 'input' | 'output'
  operation: string
  body: string
}) {
  const { t } = useTranslation()
  const [showRaw, setShowRaw] = useState(false)
  const formatted = formatAiMonitorBody(body || '—', { kind, operation })
  return (
    <div>
      <div className="prose-monitor mb-1 max-h-48 overflow-auto rounded border border-mist bg-paper/90 p-2 text-sm text-ink">
        <ReactMarkdown>{formatted.text}</ReactMarkdown>
      </div>
      {body && body !== '—' ? (
        <>
          <button
            type="button"
            className="mb-1 text-[11px] text-muted underline-offset-2 hover:text-accent hover:underline"
            onClick={() => setShowRaw((v) => !v)}
          >
            {showRaw ? t('settings.monitorHideRaw') : t('settings.monitorShowRaw')}
          </button>
          {showRaw ? (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-mist p-2 font-mono text-[11px] text-muted">
              {body}
            </pre>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export default function AiMonitorPage() {
  const { t } = useTranslation()
  const [expandedCall, setExpandedCall] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [stickBottom, setStickBottom] = useState(true)
  const [paused, setPaused] = useState(false)
  const [opFilter, setOpFilter] = useState('')
  const [streamFlights, setStreamFlights] = useState<Record<string, string>>({})
  const [sseLive, setSseLive] = useState(false)
  const [rawKeys, setRawKeys] = useState<Record<string, boolean>>({})
  const consoleRef = useRef<HTMLDivElement>(null)

  const monitor = useQuery({
    queryKey: ['ai-monitor'],
    queryFn: api.aiMonitor,
    refetchInterval: (q) => {
      if (paused) return false
      if (sseLive) return 3000
      const flights = q.state.data?.inFlights?.length
        ? q.state.data.inFlights
        : q.state.data?.inFlight
          ? [q.state.data.inFlight]
          : []
      return flights.length > 0 ? 500 : 1000
    },
  })

  useEffect(() => {
    if (paused) return
    const es = new EventSource(api.aiMonitorStreamUrl())
    es.addEventListener('delta', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          id?: string
          responseSoFar?: string
        }
        if (data.id && data.responseSoFar != null) {
          setStreamFlights((prev) => ({ ...prev, [data.id!]: data.responseSoFar! }))
          setSseLive(true)
        }
      } catch {
        /* ignore */
      }
    })
    es.addEventListener('begin', () => setSseLive(true))
    es.addEventListener('complete', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as { id?: string }
        if (data.id) {
          setStreamFlights((prev) => {
            const next = { ...prev }
            delete next[data.id!]
            return next
          })
        }
      } catch {
        /* ignore */
      }
      void monitor.refetch()
    })
    es.addEventListener('queue', () => {
      void monitor.refetch()
    })
    es.onerror = () => setSseLive(false)
    return () => {
      es.close()
      setSseLive(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once per pause toggle
  }, [paused])

  const mon = monitor.data
  const inFlights: AiMonitorInFlight[] = (
    mon?.inFlights?.length
      ? mon.inFlights
      : mon?.inFlight
        ? [mon.inFlight]
        : []
  ).map((f) => ({
    ...f,
    responseSoFar: streamFlights[f.id] ?? f.responseSoFar,
  }))

  const queue = mon?.queue
  const flightIds = inFlights.map((f) => f.id).join(',')
  const streamLen = inFlights.reduce((n, f) => n + (f.responseSoFar?.length ?? 0), 0)

  useEffect(() => {
    if (!flightIds || paused) return
    const id = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [flightIds, paused])

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

  useEffect(() => {
    if (!stickBottom || !consoleRef.current) return
    consoleRef.current.scrollTop = consoleRef.current.scrollHeight
  }, [ioEntries.length, inFlights.length, stickBottom, mon?.callCount, streamLen])

  function onConsoleScroll() {
    const el = consoleRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    setStickBottom(nearBottom)
  }

  const usedPct = Math.min(100, Math.max(0, mon?.lastContextUsedPct ?? 0))
  const windowTokens = mon?.lastContextWindow ?? mon?.contextWindow ?? 4096

  if (monitor.isLoading) return <StateBox>{t('settings.loading')}</StateBox>
  if (monitor.isError) {
    return <StateBox>{t('common.loadFailed', { message: (monitor.error as Error).message })}</StateBox>
  }

  return (
    <div>
      <PageHeader title={t('nav.monitor')} subtitle={t('settings.monitorHint')} />
      <p className="mb-4 text-xs text-muted">
        {t('settings.monitorOpenSettings')}{' '}
        <Link className="text-moss underline underline-offset-2" to="/settings/llm">
          {t('settings.llmSection')}
        </Link>
        {sseLive ? (
          <span className="ml-2 text-moss">{t('settings.monitorStreaming')}</span>
        ) : null}
      </p>

      {queue && (queue.itemsTotal ?? 0) > 0 ? (
        <section className="mb-4 rounded-xl border border-mist bg-paper/70 px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">{t('settings.monitorQueue')}</p>
              <p className="mt-0.5 text-xs text-muted">
                {t('settings.monitorQueueDetail', {
                  done: queue.itemsDone ?? 0,
                  total: queue.itemsTotal ?? 0,
                  remaining: queue.itemsRemaining ?? 0,
                })}
              </p>
            </div>
            <p className="font-mono text-lg tabular-nums text-ink">
              {queue.itemsDone ?? 0}/{queue.itemsTotal ?? 0}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist">
            <div
              className="h-full rounded-full bg-moss transition-[width] duration-300"
              style={{
                width: `${Math.max(
                  8,
                  Math.min(
                    100,
                    ((queue.itemsDone ?? 0) / Math.max(1, queue.itemsTotal ?? 1)) * 100,
                  ),
                )}%`,
              }}
            />
          </div>
          {queue.currentItemTitle ? (
            <p className="mt-2 truncate text-xs text-muted">
              {t('settings.monitorCurrentItem', { title: queue.currentItemTitle })}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Live chat — primary visual */}
      <section className="mb-4 overflow-hidden rounded-xl border border-mist bg-gradient-to-b from-paper to-mist/30">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mist px-3 py-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-ink">
              {t('settings.monitorLiveIo')}
            </p>
            <p className="text-[11px] text-muted">{t('settings.monitorLiveIoHint')}</p>
          </div>
          <div className="flex items-center gap-2">
            {inFlights.length > 0 ? (
              <span className="font-mono text-[11px] text-accent">
                {t('settings.monitorInFlight')} {inFlights.length}
              </span>
            ) : null}
            {paused ? (
              <span className="font-mono text-[11px] text-accent">{t('settings.monitorPaused')}</span>
            ) : null}
            <button
              type="button"
              className="rounded border border-mist px-2 py-0.5 text-[11px] text-ink hover:border-accent/50 hover:text-accent"
              onClick={() => setPaused((v) => !v)}
            >
              {paused ? t('settings.monitorResume') : t('settings.monitorPause')}
            </button>
            {!stickBottom ? (
              <button
                type="button"
                className="rounded border border-mist px-2 py-0.5 text-[11px] text-ink hover:border-accent/50 hover:text-accent"
                onClick={() => {
                  setStickBottom(true)
                  if (consoleRef.current) {
                    consoleRef.current.scrollTop = consoleRef.current.scrollHeight
                  }
                }}
              >
                {t('settings.monitorScrollBottom')}
              </button>
            ) : null}
          </div>
        </div>
        {operations.length > 1 ? (
          <div className="flex flex-wrap gap-1 border-b border-mist px-3 py-2">
            <button
              type="button"
              onClick={() => setOpFilter('')}
              className={`rounded px-2 py-0.5 text-[11px] ${
                !opFilter
                  ? 'bg-moss text-paper'
                  : 'border border-mist text-muted hover:text-accent'
              }`}
            >
              {t('settings.monitorAllOps')}
            </button>
            {operations.map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setOpFilter(op)}
                className={`rounded px-2 py-0.5 font-mono text-[11px] ${
                  opFilter === op
                    ? 'bg-moss text-paper'
                    : 'border border-mist text-muted hover:text-accent'
                }`}
              >
                {op}
              </button>
            ))}
          </div>
        ) : null}
        <div
          ref={consoleRef}
          onScroll={onConsoleScroll}
          className="thin-scroll max-h-[min(52vh,28rem)] min-h-[12rem] overflow-y-auto px-3 py-4"
        >
          {ioEntries.length === 0 ? (
            <p className="text-sm text-muted">{t('settings.monitorEmpty')}</p>
          ) : (
            ioEntries.map((entry) => (
              <MonitorBubble
                key={entry.key}
                entry={entry}
                showRaw={Boolean(rawKeys[entry.key])}
                onToggleRaw={() =>
                  setRawKeys((prev) => ({ ...prev, [entry.key]: !prev[entry.key] }))
                }
              />
            ))
          )}
        </div>
      </section>

      {/* In-flight progress bars */}
      {inFlights.length > 0 ? (
        <div className="mb-4 grid gap-2">
          {filteredFlights.map((flight) => {
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
                  className="mt-2 h-2 overflow-hidden rounded-full bg-mist"
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
      ) : null}

      {!mon || (mon.callCount === 0 && inFlights.length === 0) ? null : mon.callCount === 0 ? null : (
        <div className="rounded-xl border border-mist bg-paper/70 p-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-mist px-3 py-2">
              <p className="text-xs text-muted">{t('settings.monitorTps')}</p>
              <p className="mt-1 font-mono text-lg text-ink">
                {formatTps(mon.lastTokensPerSec)}
                <span className="ml-1 text-xs text-muted">tok/s</span>
              </p>
              <p className="text-xs text-muted">
                {t('settings.monitorAvgTps', { value: formatTps(mon.avgTokensPerSec) })}
              </p>
            </div>
            <div className="rounded-lg border border-mist px-3 py-2 sm:col-span-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs text-muted">{t('settings.monitorContext')}</p>
                <p className="font-mono text-sm text-ink">
                  {mon.lastContextUsed ?? 0} / {windowTokens}
                  <span className="ml-1 text-xs text-muted">({usedPct.toFixed(0)}%)</span>
                </p>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-mist"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(usedPct)}
                aria-label={t('settings.monitorContext')}
              >
                <div
                  className={`h-full rounded-full transition-all ${
                    usedPct >= 90 ? 'bg-ember' : usedPct >= 70 ? 'bg-accent' : 'bg-moss'
                  }`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">
                {t('settings.monitorLatency', { ms: mon.lastLatencyMs ?? '—' })}
                {' · '}
                {t('settings.monitorCalls', { count: mon.callCount, errors: mon.errorCount })}
              </p>
            </div>
          </div>

          <h3 className="mb-2 text-sm font-medium text-ink">{t('settings.monitorHistory')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-xs">
              <thead className="text-muted">
                <tr className="border-b border-mist">
                  <th className="py-1.5 pr-2 font-medium">{t('settings.monitorColTime')}</th>
                  <th className="py-1.5 pr-2 font-medium">{t('settings.monitorColOp')}</th>
                  <th className="py-1.5 pr-2 font-medium">{t('settings.monitorColTokens')}</th>
                  <th className="py-1.5 pr-2 font-medium">tok/s</th>
                  <th className="py-1.5 pr-2 font-medium">{t('settings.monitorColStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {(filteredRecent ?? []).slice(0, 30).map((row) => {
                  const key = `${row.ts}-${row.operation}-${row.promptTokens}-${row.completionTokens}`
                  const open = expandedCall === key
                  const toggle = () => setExpandedCall(open ? null : key)
                  return (
                    <Fragment key={key}>
                      <tr
                        className="cursor-pointer border-b border-mist/60 text-ink hover:bg-mist/30"
                        tabIndex={0}
                        aria-expanded={open}
                        onClick={toggle}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggle()
                          }
                        }}
                      >
                        <td className="py-1.5 pr-2 font-mono text-[11px] text-muted">
                          {formatClock(row.ts)}
                        </td>
                        <td className="py-1.5 pr-2 font-mono">
                          {open ? '▾ ' : '▸ '}
                          {row.operation}
                        </td>
                        <td className="py-1.5 pr-2 font-mono">
                          {row.promptTokens}+{row.completionTokens}
                          {row.truncated ? (
                            <span className="ml-1 text-ember">{t('settings.monitorTruncated')}</span>
                          ) : null}
                        </td>
                        <td className="py-1.5 pr-2 font-mono">{formatTps(row.tokensPerSec)}</td>
                        <td className="py-1.5 pr-2">
                          {row.ok ? (
                            <span className="text-moss">{t('common.yes')}</span>
                          ) : (
                            <span className="text-ember" title={row.error ?? undefined}>
                              {t('common.no')}
                            </span>
                          )}
                        </td>
                      </tr>
                      {open ? (
                        <tr className="border-b border-mist/60">
                          <td colSpan={5} className="bg-paper/80 px-2 py-2" onClick={(e) => e.stopPropagation()}>
                            <p className="mb-1 text-[11px] font-medium text-muted">
                              {t('settings.monitorInput')}
                            </p>
                            <div className="mb-3">
                              <HistoryBody
                                kind="input"
                                operation={row.operation}
                                body={row.promptPreview || '—'}
                              />
                            </div>
                            <p className="mb-1 text-[11px] font-medium text-muted">
                              {t('settings.monitorOutput')}
                            </p>
                            <HistoryBody
                              kind="output"
                              operation={row.operation}
                              body={row.responsePreview || row.error || '—'}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
