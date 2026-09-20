import { ApiError } from './api'

/** Minimal shape of an i18next `t` function — keeps this module i18n-agnostic. */
type Translate = (key: string) => string

/** Raw JVM / transport strings that should never surface in the UI. */
const INFRA_NOISE =
  /ConnectException|ClosedChannelException|Connection (?:refused|reset)|ECONNREFUSED|ECONNRESET|ETIMEDOUT|UnknownHostException|SocketTimeoutException|Failed to fetch|Load failed|NetworkError|fetch failed/i

/**
 * Turn any thrown value into a human-readable, localized string.
 *
 * The raw browser message for an unreachable backend ("Failed to fetch",
 * "Load failed", …) is useless to a user, so network failures get a friendly
 * hint instead. JVM exception chains from the chat/LLM path are sanitized too.
 */
export function errorText(err: unknown, t: Translate): string {
  if (err instanceof ApiError && err.code === 'network') {
    return t('common.networkError')
  }
  const raw =
    err instanceof Error && err.message
      ? err.message
      : typeof err === 'string'
        ? err
        : err != null
          ? String(err)
          : ''
  if (raw && INFRA_NOISE.test(raw)) {
    // Backend reached but model/sidecar transport failed (common on chat SSE).
    if (err instanceof ApiError && err.status >= 500) {
      return t('common.llmUnavailable')
    }
    if (err instanceof ApiError && err.code === 'error') {
      return t('common.llmUnavailable')
    }
    return t('common.networkError')
  }
  if (raw) return raw
  return String(err)
}
