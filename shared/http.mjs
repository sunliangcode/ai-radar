/**
 * Shared HTTP helpers for CLI + MCP (Node built-ins only).
 */

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
 * @param {number} [fallbackMs=8000]
 * @returns {AbortSignal | undefined}
 */
export function requestTimeoutSignal(fallbackMs = 8000) {
  const raw = process.env.AI_RADAR_TIMEOUT_MS
  const trimmed = raw == null ? '' : String(raw).trim()
  const ms = trimmed !== '' ? Number(trimmed) : fallbackMs
  if (!Number.isFinite(ms) || ms <= 0) return undefined
  if (typeof AbortSignal === 'undefined' || typeof AbortSignal.timeout !== 'function') {
    return undefined
  }
  return AbortSignal.timeout(ms)
}
