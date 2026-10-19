import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { modelPresentCheck } from './model-present.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('modelPresentCheck skips when missing or ok', () => {
  assert.equal(modelPresentCheck(null), null)
  assert.equal(modelPresentCheck({ ok: true, modelPresent: true }), null)
  assert.equal(modelPresentCheck({ ok: false, modelPresent: false }), null)
  assert.equal(modelPresentCheck({ ok: true }), null)
})

test('modelPresentCheck warns when configured model missing', () => {
  const r = modelPresentCheck({
    ok: true,
    modelPresent: false,
    model: 'qwen',
    models: ['llama'],
  })
  assert.equal(r.ok, true)
  assert.equal(r.level, 'warn')
  assert.match(r.detail, /qwen/)
  assert.ok(r.next)
  assert.deepEqual(r.data.models, ['llama'])
})

test('cli doctor uses shared model-present helper', () => {
  const src = readFileSync(join(root, 'cli/ai-radar.mjs'), 'utf8')
  assert.match(src, /from '\.\.\/shared\/model-present\.mjs'/)
  assert.match(src, /modelPresentCheck\(/)
})
