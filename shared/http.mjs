/**
 * Shared HTTP helpers for CLI + MCP (Node built-ins only).
 */

/** Default AbortSignal timeout for short reads (health, catalogs, …). */
export const DEFAULT_REQUEST_TIMEOUT_MS = 8000

/**
 * Fallback for long-running job POSTs (fetch/push/cluster/impact).
 * 0 → {@link requestTimeoutSignal} disables AbortSignal when env is unset.
 */
export const DEFAULT_JOB_TIMEOUT_MS = 0

/**
 * Normalize AI_RADAR_BASE_URL: trim, fall back when empty, drop trailing slashes.
 * @param {string|null|undefined} raw
 * @param {string} [fallback='http://127.0.0.1:8080']
 * @returns {string}
 */
export function apiBaseUrl(raw, fallback = 'http://127.0.0.1:8080') {
  const trimmed = raw == null ? '' : String(raw).trim()
  const base = trimmed === '' ? fallback : trimmed
  return base.replace(/\/+$/, '')
}

/**
 * @param {number} [fallbackMs=DEFAULT_REQUEST_TIMEOUT_MS]
 * @returns {AbortSignal | undefined}
 */
export function requestTimeoutSignal(fallbackMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  const raw = process.env.AI_RADAR_TIMEOUT_MS
  const trimmed = raw == null ? '' : String(raw).trim()
  const ms = trimmed !== '' ? Number(trimmed) : fallbackMs
  if (!Number.isFinite(ms) || ms <= 0) return undefined
  if (typeof AbortSignal === 'undefined' || typeof AbortSignal.timeout !== 'function') {
    return undefined
  }
  return AbortSignal.timeout(ms)
}
