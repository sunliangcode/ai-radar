/**
 * Map GET /api/health.translate into a doctor check row.
 * @param {{ status?: string }|null|undefined} translate
 * @returns {null | { id: string, ok: boolean, level: 'ok'|'warn', detail: string, next?: string }}
 */
export function translateStatusCheck(translate) {
  if (translate == null || translate.status == null) return null
  const status = typeof translate.status === 'string' ? translate.status.trim() : translate.status
  if (status === '') return null
  if (status === 'up') {
    return { id: 'translate', ok: true, level: 'ok', detail: 'up (en→zh titles)' }
  }
  if (status === 'disabled') {
    return {
      id: 'translate',
      ok: true,
      level: 'warn',
      detail: 'disabled — titles stay English',
    }
  }
  return {
    id: 'translate',
    ok: false,
    level: 'warn',
    detail: 'not up — titles stay English; ./install.sh or translate-service/',
    next: 'Optional: start Argos translate (./install.sh) for en→zh titles',
  }
}
