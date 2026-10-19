/**
 * Compare CLI SemVer to GET /api/health.version for doctor reports.
 * @param {string} cliVersion
 * @param {string|null|undefined} apiVersion
 * @returns {null | { id: string, ok: boolean, level: 'ok'|'warn', detail: string, data?: { cli: string, api: string } }}
 */
export function versionAlignCheck(cliVersion, apiVersion) {
  const cli = typeof cliVersion === 'string' ? cliVersion.trim() : cliVersion
  const api = typeof apiVersion === 'string' ? apiVersion.trim() : apiVersion
  if (api == null || api === '') return null
  if (api === cli) {
    return {
      id: 'versionAlign',
      ok: true,
      level: 'ok',
      detail: `CLI and API ${api}`,
    }
  }
  return {
    id: 'versionAlign',
    ok: false,
    level: 'warn',
    detail: `CLI ${cli} vs API ${api} — update checkout / rebuild backend`,
    data: { cli, api },
  }
}
