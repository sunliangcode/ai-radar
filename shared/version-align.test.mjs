import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { versionAlignCheck } from './version-align.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('versionAlignCheck skips when API version missing', () => {
  assert.equal(versionAlignCheck('0.1.0', null), null)
  assert.equal(versionAlignCheck('0.1.0', ''), null)
  assert.equal(versionAlignCheck('0.1.0', '  '), null)
  assert.equal(versionAlignCheck('0.1.0', undefined), null)
})

test('versionAlignCheck ok when versions match', () => {
  const r = versionAlignCheck('0.1.0', '0.1.0')
  assert.equal(r.ok, true)
  assert.equal(r.level, 'ok')
  assert.match(r.detail, /0\.1\.0/)
  assert.equal(versionAlignCheck(' 0.1.0 ', '0.1.0 ').ok, true)
})

test('versionAlignCheck warn when versions differ', () => {
  const r = versionAlignCheck('0.1.0', '0.2.0')
  assert.equal(r.ok, false)
  assert.equal(r.level, 'warn')
  assert.deepEqual(r.data, { cli: '0.1.0', api: '0.2.0' })
  assert.match(r.detail, /0\.1\.0/)
  assert.match(r.detail, /0\.2\.0/)
})

test('cli doctor uses shared version-align helper', () => {
  const src = readFileSync(join(root, 'cli/ai-radar.mjs'), 'utf8')
  assert.match(src, /from '\.\.\/shared\/version-align\.mjs'/)
  assert.match(src, /versionAlignCheck\(/)
})
