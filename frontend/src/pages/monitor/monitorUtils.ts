import type { AiMonitorCall, AiMonitorInFlight } from '../../lib/api'

export function formatTps(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—'
  return v >= 100 ? v.toFixed(0) : v.toFixed(1)
}

/** Soft progress from elapsed ms — matches backend asymptote toward 90%. */
export function progressFromElapsed(elapsedMs: number): number {
  return Math.min(90, 90 * (1 - Math.exp(-elapsedMs / 15_000)))
}

/** Locale-aware clock for monitor rows (backend Instant is UTC). */
export function formatClock(iso: string, locale = 'en'): string {
  const d = Date.parse(iso)
  if (!Number.isFinite(d)) return iso.slice(11, 19) || iso
  const tag = locale.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
  return new Date(d).toLocaleTimeString(tag, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

const MONITOR_OP_KEYS: Record<string, string> = {
  chat: 'settings.monitorOp.chat',
  score: 'settings.monitorOp.score',
  summarize: 'settings.monitorOp.summarize',
  summarizeBatch: 'settings.monitorOp.summarizeBatch',
  extractPreference: 'settings.monitorOp.extractPreference',
  suggestItemAction: 'settings.monitorOp.suggestItemAction',
  assignEvent: 'settings.monitorOp.assignEvent',
  eventIntelligence: 'settings.monitorOp.eventIntelligence',
  extractItems: 'settings.monitorOp.extractItems',
  extractContext: 'settings.monitorOp.extractContext',
  analyzeImpact: 'settings.monitorOp.analyzeImpact',
  suggestOpportunity: 'settings.monitorOp.suggestOpportunity',
}

/** Map backend operation codes to i18n labels; unknown codes stay as-is. */
export function monitorOpLabel(operation: string, t: (key: string) => string): string {
  const key = MONITOR_OP_KEYS[operation]
  return key ? t(key) : operation
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
