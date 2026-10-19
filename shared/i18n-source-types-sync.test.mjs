/**
 * en/zh sourceType labels must include every SourceType (uppercase key).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOURCE_TYPES } from './pack.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function sourceTypeKeys(rel) {
  const json = JSON.parse(readFileSync(join(root, rel), 'utf8'))
  const block = json.sourceType
  assert.ok(block && typeof block === 'object', `${rel}: missing sourceType`)
  return new Set(Object.keys(block).filter((k) => /^[A-Z][A-Z0-9_]*$/.test(k)))
}

test('en.json sourceType covers SOURCE_TYPES', () => {
  const keys = sourceTypeKeys('frontend/src/i18n/locales/en.json')
  const missing = [...SOURCE_TYPES].filter((t) => !keys.has(t))
  assert.deepEqual(missing, [], 'Add uppercase sourceType.* keys to en.json')
})

test('zh.json sourceType covers SOURCE_TYPES', () => {
  const keys = sourceTypeKeys('frontend/src/i18n/locales/zh.json')
  const missing = [...SOURCE_TYPES].filter((t) => !keys.has(t))
  assert.deepEqual(missing, [], 'Add uppercase sourceType.* keys to zh.json')
})
