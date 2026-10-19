/**
 * Built-in and example pack JSON must pass shared validatePackFile (doctor / pack validate).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validatePackFile } from './pack.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fs = { existsSync, readFileSync }

test('examples/packs/demo-local.json validates', () => {
  const path = join(root, 'examples/packs/demo-local.json')
  const r = validatePackFile(path, fs)
  assert.equal(r.ok, true, r.errors.join('; '))
  assert.equal(r.count, 1)
  assert.equal(r.errors.length, 0)
})

test('packs/sources/*.json all validate', () => {
  const dir = join(root, 'packs/sources')
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
  assert.ok(files.length >= 3, `expected ≥3 built-in packs, got ${files.length}`)
  for (const f of files) {
    const r = validatePackFile(join(dir, f), fs)
    assert.equal(r.ok, true, `${f}: ${r.errors.join('; ')}`)
    assert.ok(r.count >= 1, `${f}: empty pack`)
  }
})
