/**
 * Keep frontend BUILTIN_CONNECTOR_FIELD_CHECKS aligned with shared BUILTIN_CONNECTOR_PAIRS,
 * and frontend connectorFieldType aligned with shared/spi-catalog.mjs.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BUILTIN_CONNECTOR_PAIRS, connectorFieldType } from './spi-catalog.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tsPath = join(root, 'frontend/src/lib/connectors.ts')

function parseFrontendChecks(text) {
  const body = text.match(
    /export const BUILTIN_CONNECTOR_FIELD_CHECKS = \[([\s\S]*?)\] as const/,
  )
  assert.ok(body, 'BUILTIN_CONNECTOR_FIELD_CHECKS not found in connectors.ts')
  const rows = []
  const re = /\{\s*id:\s*'([^']+)',\s*field:\s*'([^']+)'/g
  let m
  while ((m = re.exec(body[1])) != null) {
    rows.push([m[1], m[2]])
  }
  return rows
}

test('frontend BUILTIN_CONNECTOR_FIELD_CHECKS matches spi BUILTIN_CONNECTOR_FIELDS + FIXTURE', () => {
  const ts = readFileSync(tsPath, 'utf8')
  const fromTs = parseFrontendChecks(ts)
  assert.ok(fromTs.length >= 10, `expected many frontend checks, got ${fromTs.length}`)

  assert.deepEqual(
    fromTs,
    [...BUILTIN_CONNECTOR_PAIRS],
    'Update frontend/src/lib/connectors.ts BUILTIN_CONNECTOR_FIELD_CHECKS when changing shared/spi-catalog.mjs BUILTIN_CONNECTOR_PAIRS',
  )
})

test('frontend connectorFieldType mirrors shared connectorFieldType', () => {
  const ts = readFileSync(tsPath, 'utf8')
  assert.match(
    ts,
    /export function connectorFieldType\(field: string\): 'path' \| 'text' \{\s*return field === 'cliPath' \|\| field === 'path' \? 'path' : 'text'\s*\}/,
  )
  for (const [, field] of BUILTIN_CONNECTOR_PAIRS) {
    assert.equal(connectorFieldType(field), field === 'path' || field === 'cliPath' ? 'path' : 'text')
  }
})
