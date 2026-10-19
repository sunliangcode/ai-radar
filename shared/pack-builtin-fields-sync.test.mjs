/**
 * Keep pack validate soft-warns aligned with BUILTIN_CONNECTOR_PAIRS.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BUILTIN_CONNECTOR_FIELDS, BUILTIN_CONNECTOR_PAIRS } from './spi-catalog.mjs'
import { validatePackFile } from './pack.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function memFs(json) {
  const path = join(root, 'tmp-pack-builtin-fields.json')
  const text = JSON.stringify(json)
  return {
    path,
    fs: {
      existsSync: (p) => p === path,
      readFileSync: (p) => {
        if (p !== path) throw new Error(`unexpected path ${p}`)
        return text
      },
    },
  }
}

test('pack validate warns for FIXTURE path and every BUILTIN_CONNECTOR_FIELDS key', () => {
  for (const [typeId, field] of BUILTIN_CONNECTOR_PAIRS) {
    const { path, fs } = memFs([{ type: typeId, name: `${typeId} row`, config: {} }])
    const r = validatePackFile(path, fs)
    assert.equal(r.ok, true, `${typeId}: unexpected errors ${r.errors.join('; ')}`)
    const hit = r.warnings.some((w) => w.includes(`config.${field}`))
    assert.ok(hit, `${typeId}: expected warn mentioning config.${field}; got ${r.warnings.join(' | ')}`)
  }
})

test('pack validate accepts filled BUILTIN_CONNECTOR_FIELDS without field warns', () => {
  const rows = [
    { type: 'FIXTURE', name: 'fx', config: { path: '/tmp/f.json' } },
    { type: 'RSS', name: 'rss', config: { feedUrl: 'https://ex.com/feed' } },
  ]
  for (const [typeId, field] of BUILTIN_CONNECTOR_FIELDS) {
    if (typeId === 'RSS') continue
    let value
    if (field === 'maxItems' || field === 'maxMessages') value = 10
    else if (['channels', 'subreddits', 'nodes', 'users', 'keywords'].includes(field)) {
      value = ['x']
    } else value = 'x'
    rows.push({ type: typeId, name: typeId, config: { [field]: value } })
  }
  const { path, fs } = memFs(rows)
  const r = validatePackFile(path, fs)
  assert.equal(r.ok, true, r.errors.join('; '))
  const fieldWarns = r.warnings.filter((w) => /usually set config\./.test(w))
  assert.deepEqual(fieldWarns, [], `unexpected field warns: ${fieldWarns.join(' | ')}`)
})
