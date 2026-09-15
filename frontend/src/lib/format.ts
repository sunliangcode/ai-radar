/** Human-readable "in X minutes / in 2 hours" for schedule next-run times. */
export function formatRelativeInstant(iso?: string | null, now: number = Date.now()): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  const deltaMs = t - now
  const abs = Math.abs(deltaMs)
  if (abs < 60_000) return deltaMs >= 0 ? '<1m' : '-'
  if (abs < 3_600_000) {
    const m = Math.round(abs / 60_000)
    return deltaMs >= 0 ? `${m}m` : `-${m}m`
  }
  if (abs < 86_400_000) {
    const h = Math.round(abs / 3_600_000)
    return deltaMs >= 0 ? `${h}h` : `-${h}h`
  }
  const d = Math.round(abs / 86_400_000)
  return deltaMs >= 0 ? `${d}d` : `-${d}d`
}

export function formatDuration(ms?: number | null): string {
  if (ms == null || Number.isNaN(ms)) return '—'
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`
  const sec = ms / 1000
  if (sec < 60) return `${sec.toFixed(1)}s`
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function progressPercent(progress: {
  stage: string
  totals: { total: number; done: number }
}): number {
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
