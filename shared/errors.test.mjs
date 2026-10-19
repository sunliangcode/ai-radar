import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { explainCliError, formatToolError, isConnRefused, isTimeout } from './errors.mjs'

test('isConnRefused detects fetch failed', () => {
  assert.equal(isConnRefused(new Error('fetch failed')), true)
  const err = new Error('fetch failed')
  err.cause = { code: 'ECONNREFUSED' }
  assert.equal(isConnRefused(err), true)
  assert.equal(isConnRefused(new Error('409 busy')), false)
})

test('formatToolError backend unreachable', () => {
  const out = formatToolError(new Error('fetch failed'), { base: 'http://127.0.0.1:9' })
  assert.equal(out.error, 'backend_unreachable')
  assert.match(out.hint, /Cannot reach backend/)
  assert.ok(out.fix.some((f) => /install\.sh/.test(f)))
})

test('explainCliError matches MCP for 409', () => {
  const { exit, lines } = explainCliError(new Error('409 already running'))
  assert.equal(exit, 3)
  assert.ok(lines.some((l) => /already running/i.test(l)))
})

test('formatToolError writes_disabled', () => {
  const out = formatToolError(Object.assign(new Error('writes_disabled'), { code: 'writes_disabled' }))
  assert.equal(out.error, 'writes_disabled')
})

test('formatToolError 401', () => {
  const out = formatToolError(new Error('401 unauthorized'))
  assert.equal(out.error, 'unauthorized')
  assert.equal(out.status, 401)
})

test('formatToolError 403 suggests LOCAL_TOKEN', () => {
  const out = formatToolError(new Error('403 forbidden'))
  assert.equal(out.error, 'unauthorized')
  assert.equal(out.status, 403)
  assert.ok(out.fix.some((f) => /LOCAL_TOKEN/.test(f)))
})

test('explainCliError unreachable mentions install.sh and doctor', () => {
  const { exit, lines } = explainCliError(new Error('fetch failed'), { base: 'http://127.0.0.1:1' })
  assert.equal(exit, 1)
  assert.ok(lines.some((l) => /install\.sh/.test(l)))
  assert.ok(lines.some((l) => /\bdoctor\b/.test(l)))
})

test('isTimeout detects AbortError / TimeoutError', () => {
  assert.equal(isTimeout(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })), true)
  assert.equal(isTimeout(Object.assign(new Error('timeout'), { name: 'TimeoutError' })), true)
  assert.equal(isTimeout(new Error('fetch failed')), false)
})

test('formatToolError request timeout suggests AI_RADAR_TIMEOUT_MS', () => {
  const err = Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })
  const out = formatToolError(err, { base: 'http://127.0.0.1:8080' })
  assert.equal(out.error, 'request_timeout')
  assert.ok(out.fix.some((f) => /AI_RADAR_TIMEOUT_MS/.test(f)))
  assert.ok(out.fix.some((f) => /does not stop a server job/i.test(f)))
  assert.ok(out.fix.some((f) => /409|fetch\/progress|AI Monitor/i.test(f)))
})

test('isConnRefused detects ENOTFOUND', () => {
  assert.equal(isConnRefused(Object.assign(new Error('getaddrinfo'), { code: 'ENOTFOUND' })), true)
})

test('formatToolError 404 suggests docs', () => {
  const out = formatToolError(new Error('404 missing'), { base: 'http://127.0.0.1:8080' })
  assert.equal(out.error, 'not_found')
  assert.equal(out.status, 404)
  assert.ok(out.fix.some((f) => /api\.md|Swagger/i.test(f)))
})

test('formatToolError normalizes padded base URL', () => {
  const out = formatToolError(new Error('404 missing'), { base: '  http://127.0.0.1:8080/  ' })
  assert.match(out.hint, /currently http:\/\/127\.0\.0\.1:8080\)/)
})

test('explainCliError timeout suggests AI_RADAR_TIMEOUT_MS', () => {
  const err = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
  const { exit, lines } = explainCliError(err, { base: 'http://127.0.0.1:8080' })
  assert.equal(exit, 1)
  assert.ok(lines.some((l) => /AI_RADAR_TIMEOUT_MS/.test(l)))
  assert.ok(lines.some((l) => /does not stop a server job/i.test(l)))
})
