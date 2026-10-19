import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { translateStatusCheck } from './translate-status.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('translateStatusCheck skips when missing', () => {
  assert.equal(translateStatusCheck(null), null)
  assert.equal(translateStatusCheck({}), null)
  assert.equal(translateStatusCheck({ status: '  ' }), null)
})

test('translateStatusCheck ok when up', () => {
  const r = translateStatusCheck({ status: 'up' })
  assert.equal(r.ok, true)
  assert.equal(r.level, 'ok')
})

test('translateStatusCheck warn when disabled', () => {
  const r = translateStatusCheck({ status: 'disabled' })
  assert.equal(r.ok, true)
  assert.equal(r.level, 'warn')
})

test('translateStatusCheck warn when down', () => {
  const r = translateStatusCheck({ status: 'down' })
  assert.equal(r.ok, false)
  assert.equal(r.level, 'warn')
  assert.ok(r.next)
})

test('cli doctor uses shared translate-status helper', () => {
  const src = readFileSync(join(root, 'cli/ai-radar.mjs'), 'utf8')
  assert.match(src, /from '\.\.\/shared\/translate-status\.mjs'/)
  assert.match(src, /translateStatusCheck\(/)
})
