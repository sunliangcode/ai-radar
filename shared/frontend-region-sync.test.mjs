/**
 * Frontend domestic/foreign region sets must cover every non-legacy SourceType.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOURCE_TYPES, LEGACY_SOURCE_TYPES } from './pack.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const displayPath = join(root, 'frontend/src/lib/displaySources.ts')

function parseSet(name, text) {
  const m = text.match(new RegExp(`export const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`))
  assert.ok(m, `${name} not found in displaySources.ts`)
  const types = []
  for (const line of m[1].split('\n')) {
    const t = line.match(/'([A-Z][A-Z0-9_]*)'/)
    if (t) types.push(t[1])
  }
  return new Set(types)
}

test('DOMESTIC ∪ FOREIGN covers all non-legacy SourceTypes', () => {
  const text = readFileSync(displayPath, 'utf8')
  const domestic = parseSet('DOMESTIC_SOURCE_TYPES', text)
  const foreign = parseSet('FOREIGN_SOURCE_TYPES', text)
  const covered = new Set([...domestic, ...foreign])
  const missing = [...SOURCE_TYPES].filter((t) => !LEGACY_SOURCE_TYPES.has(t) && !covered.has(t))
  const overlap = [...domestic].filter((t) => foreign.has(t))
  assert.deepEqual(
    { missing, overlap },
    { missing: [], overlap: [] },
    'Update frontend/src/lib/displaySources.ts region sets when adding SourceTypes'
  )
})
