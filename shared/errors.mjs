/**
 * Shared actionable error helpers for ops CLI and MCP.
 * Keep CLI human text and MCP JSON payloads aligned.
 */
import { apiBaseUrl } from './http.mjs'

export function isConnRefused(err) {
  const msg = String(err?.message || err || '')
  const cause = err?.cause
  const code = cause?.code || err?.code
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    /fetch failed/i.test(msg) ||
    /ECONNREFUSED/i.test(msg) ||
    /network/i.test(msg)
  )
}

/** True when AbortSignal.timeout / user abort ended the request. */
export function isTimeout(err) {
  const name = err?.name || err?.cause?.name
  const code = err?.code || err?.cause?.code
  const msg = String(err?.message || err || '')
  return (
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    code === 'ABORT_ERR' ||
    /aborted/i.test(msg) ||
    /timed?\s*out/i.test(msg)
  )
}

function statusFrom(err) {
  if (err?.status != null && err.status !== '') return Number(err.status)
  const msg = String(err?.message || err || '')
  const m = /^(\d{3})\b/.exec(msg)
  return m ? Number(m[1]) : undefined
}

/**
 * Structured payload for MCP (and tests).
 * @param {unknown} err
 * @param {{ base?: string }} [opts]
 */
export function formatToolError(err, opts = {}) {
  const base = apiBaseUrl(opts.base)
  const msg = String(err?.message || err || '')
  const status = statusFrom(err)

  if (msg === 'writes_disabled' || err?.code === 'writes_disabled') {
    return {
      error: 'writes_disabled',
      hint: 'Write tools are not enabled for this MCP server.',
      fix: [
        'Set ALLOW_WRITES=true in the MCP server env (only if the user asked to mutate jobs).',
        'Or use CLI: ./bin/ai-radar fetch|push|cluster',
      ],
    }
  }

  if (status === 409) {
    return {
      error: 'job_conflict',
      status: 409,
      hint: 'A fetch/push/cluster job is already running (mutex).',
      fix: [
        'Wait, then retry.',
        'Check Settings → System / AI Monitor, or ./bin/ai-radar health',
      ],
    }
  }

  if (status === 401 || status === 403) {
    return {
      error: 'unauthorized',
      status,
      hint: `Backend rejected the request (${status}).`,
      fix: ['Set LOCAL_TOKEN to match backend/.env (sent as X-Local-Token).'],
    }
  }

  if (status === 404) {
    return {
      error: 'not_found',
      status: 404,
      hint: `Not found (404): check AI_RADAR_BASE_URL (currently ${base}) and API path.`,
      fix: ['Verify the backend route in docs/api.md or Swagger.'],
    }
  }

  if (isTimeout(err)) {
    return {
      error: 'request_timeout',
      hint: `Request to ${base} timed out.`,
      fix: [
        'Raise AI_RADAR_TIMEOUT_MS (default 8000) or set 0 to disable',
        'Check backend load: ./bin/ai-radar doctor  or  ./scripts/status.sh',
      ],
    }
  }

  if (isConnRefused(err) || status === 0) {
    return {
      error: 'backend_unreachable',
      hint: `Cannot reach backend at ${base}.`,
      fix: [
        'Start: ./install.sh  or  cd backend && ./mvnw spring-boot:run',
        'Verify: ./scripts/status.sh  or  ./bin/ai-radar doctor',
        'Check AI_RADAR_BASE_URL',
      ],
    }
  }

  return {
    error: 'api_error',
    status,
    hint: msg,
    fix: ['See docs/mcp.md and docs/cli.md'],
  }
}

/**
 * CLI stderr lines + exit code (same cases as formatToolError).
 * @param {unknown} err
 * @param {{ base?: string }} [opts]
 * @returns {{ exit: number, lines: string[] }}
 */
export function explainCliError(err, opts = {}) {
  const payload = formatToolError(err, opts)
  const lines = [payload.hint, ...(payload.fix || [])]
  if (payload.error === 'api_error' && err?.message && err.message !== payload.hint) {
    lines.push(`Detail: ${err.message}`)
  }
  let exit = 1
  if (payload.error === 'job_conflict') exit = 3
  return { exit, lines }
}
