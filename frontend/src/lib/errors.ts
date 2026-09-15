import { ApiError } from './api'

/** Minimal shape of an i18next `t` function — keeps this module i18n-agnostic. */
type Translate = (key: string) => string

/**
 * Turn any thrown value into a human-readable, localized string.
 *
 * The raw browser message for an unreachable backend ("Failed to fetch",
 * "Load failed", …) is useless to a user, so network failures get a friendly
 * hint instead. Everything else falls back to `Error.message`.
 */
export function errorText(err: unknown, t: Translate): string {
  if (err instanceof ApiError && err.code === 'network') {
    return t('common.networkError')
  }
  if (err instanceof Error && err.message) {
    return err.message
  }
  return String(err)
}
