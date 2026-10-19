/**
 * Keep frontend BUILTIN_DELIVERY_SETTING_CHECKS aligned with shared BUILTIN_DELIVERY_SETTINGS.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BUILTIN_DELIVERY_SETTINGS } from './spi-catalog.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tsPath = join(root, 'frontend/src/lib/connectors.ts')

function parseFrontendChecks(text) {
  const body = text.match(
    /export const BUILTIN_DELIVERY_SETTING_CHECKS = \[([\s\S]*?)\] as const/,
  )
  assert.ok(body, 'BUILTIN_DELIVERY_SETTING_CHECKS not found in connectors.ts')
  const rows = []
  const re = /\{\s*id:\s*'([^']+)',\s*key:\s*'([^']+)'/g
  let m
  while ((m = re.exec(body[1])) != null) {
    rows.push([m[1], m[2]])
  }
  return rows
}

test('frontend BUILTIN_DELIVERY_SETTING_CHECKS matches spi BUILTIN_DELIVERY_SETTINGS', () => {
  const ts = readFileSync(tsPath, 'utf8')
  const fromTs = parseFrontendChecks(ts)
  assert.ok(fromTs.length >= 4, `expected delivery checks, got ${fromTs.length}`)
  assert.deepEqual(
    fromTs,
    [...BUILTIN_DELIVERY_SETTINGS],
    'Update frontend/src/lib/connectors.ts BUILTIN_DELIVERY_SETTING_CHECKS when changing shared/spi-catalog.mjs BUILTIN_DELIVERY_SETTINGS',
  )
})
