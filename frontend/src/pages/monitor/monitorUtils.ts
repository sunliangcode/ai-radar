import type { AiMonitorCall, AiMonitorInFlight } from '../../lib/api'

export function formatTps(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—'
  return v >= 100 ? v.toFixed(0) : v.toFixed(1)
}

/** Soft progress from elapsed ms — matches backend asymptote toward 90%. */
export function progressFromElapsed(elapsedMs: number): number {
  return Math.min(90, 90 * (1 - Math.exp(-elapsedMs / 15_000)))
}

export function formatClock(iso: string): string {
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

export type IoEntry = {
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

export function buildIoEntries(
  inFlights: AiMonitorInFlight[],
  recent: AiMonitorCall[],
): IoEntry[] {
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
