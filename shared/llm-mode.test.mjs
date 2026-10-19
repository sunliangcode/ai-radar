import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { llmModeCheck } from './llm-mode.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('llmModeCheck skips when missing', () => {
  assert.equal(llmModeCheck(null), null)
  assert.equal(llmModeCheck({}), null)
  assert.equal(llmModeCheck({ mode: '  ' }), null)
})

test('llmModeCheck ok for ai', () => {
  const r = llmModeCheck({ mode: 'ai', model: 'qwen' })
  assert.equal(r.ok, true)
  assert.equal(r.level, 'ok')
  assert.match(r.detail, /qwen/)
})

test('llmModeCheck warn for heuristic', () => {
  const r = llmModeCheck({ mode: 'heuristic' })
  assert.equal(r.ok, true)
  assert.equal(r.level, 'warn')
  assert.ok(r.next)
})

test('llmModeCheck warn for degraded', () => {
  const r = llmModeCheck({ mode: 'degraded', lastError: 'timeout' })
  assert.equal(r.ok, false)
  assert.equal(r.level, 'warn')
  assert.match(r.detail, /timeout/)
  assert.ok(r.next)
})

test('cli doctor uses shared llm-mode helper', () => {
  const src = readFileSync(join(root, 'cli/ai-radar.mjs'), 'utf8')
  assert.match(src, /from '\.\.\/shared\/llm-mode\.mjs'/)
  assert.match(src, /llmModeCheck\(/)
})
