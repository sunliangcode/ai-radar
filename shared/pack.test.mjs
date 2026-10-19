import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validatePackFile, SOURCE_TYPES, LEGACY_SOURCE_TYPES } from './pack.mjs'

function memFs(files) {
  return {
    existsSync: (p) => Object.prototype.hasOwnProperty.call(files, p),
    readFileSync: (p) => {
      if (!Object.prototype.hasOwnProperty.call(files, p)) throw new Error('ENOENT')
      return files[p]
    },
  }
}

test('SOURCE_TYPES includes FIXTURE and RSS', () => {
  assert.ok(SOURCE_TYPES.has('FIXTURE'))
  assert.ok(SOURCE_TYPES.has('RSS'))
  assert.ok(SOURCE_TYPES.has('DAILY_HOT'))
})

test('validatePackFile accepts demo-shaped array', () => {
  const fs = memFs({
    '/p.json': JSON.stringify([
      { type: 'FIXTURE', name: 'Demo', defaultEnabled: true, config: { path: 'x' } },
    ]),
  })
  const r = validatePackFile('/p.json', fs)
  assert.equal(r.ok, true)
  assert.equal(r.count, 1)
  assert.equal(r.errors.length, 0)
})

test('validatePackFile rejects missing file', () => {
  const r = validatePackFile('/nope.json', memFs({}))
  assert.equal(r.ok, false)
  assert.match(r.errors[0], /not found/i)
})

test('validatePackFile rejects non-array', () => {
  const r = validatePackFile('/p.json', memFs({ '/p.json': '{"type":"RSS"}' }))
  assert.equal(r.ok, false)
  assert.match(r.errors[0], /array/i)
})

test('validatePackFile rejects empty array', () => {
  const r = validatePackFile('/p.json', memFs({ '/p.json': '[]' }))
  assert.equal(r.ok, false)
  assert.ok(r.errors.some((e) => /empty/i.test(e)))
})

test('validatePackFile rejects invalid JSON', () => {
  const r = validatePackFile('/p.json', memFs({ '/p.json': '{not-json' }))
  assert.equal(r.ok, false)
  assert.ok(r.errors.some((e) => /json/i.test(e)))
})

test('validatePackFile rejects unknown type and blank name', () => {
  const fs = memFs({
    '/p.json': JSON.stringify([{ type: 'NOPE', name: '  ', config: [] }]),
  })
  const r = validatePackFile('/p.json', fs)
  assert.equal(r.ok, false)
  assert.ok(r.errors.some((e) => /unknown type/i.test(e)))
  assert.ok(r.errors.some((e) => /name/i.test(e)))
  assert.ok(r.errors.some((e) => /config/i.test(e)))
})

test('validatePackFile warns on duplicate names', () => {
  const fs = memFs({
    '/p.json': JSON.stringify([
      { type: 'RSS', name: 'A', config: {} },
      { type: 'RSS', name: 'A', config: {} },
    ]),
  })
  const r = validatePackFile('/p.json', fs)
  assert.equal(r.ok, true)
  assert.ok(r.warnings.some((w) => /duplicate/i.test(w)))
})

test('validatePackFile warns on legacy JUEJIN/CSDN', () => {
  assert.ok(LEGACY_SOURCE_TYPES.has('JUEJIN'))
  const fs = memFs({
    '/p.json': JSON.stringify([{ type: 'JUEJIN', name: 'Old', config: {} }]),
  })
  const r = validatePackFile('/p.json', fs)
  assert.equal(r.ok, true)
  assert.ok(r.warnings.some((w) => /legacy/i.test(w)))
})

test('validatePackFile warns when type casing is not canonical', () => {
  const fs = memFs({
    '/p.json': JSON.stringify([{ type: 'rss', name: 'Feed', config: {} }]),
  })
  const r = validatePackFile('/p.json', fs)
  assert.equal(r.ok, true)
  assert.ok(r.warnings.some((w) => /normalized to "RSS"/i.test(w)))
})

test('validatePackFile warns when name or type has surrounding whitespace', () => {
  const fs = memFs({
    '/p.json': JSON.stringify([{ type: '  RSS  ', name: ' Feed ', config: { feedUrl: 'https://x' } }]),
  })
  const r = validatePackFile('/p.json', fs)
  assert.equal(r.ok, true)
  assert.ok(r.warnings.some((w) => /name has surrounding whitespace/i.test(w)))
  assert.ok(r.warnings.some((w) => /type has surrounding whitespace/i.test(w)))
})

test('validatePackFile accepts RSS with legacy config.url', () => {
  const fs = memFs({
    '/p.json': JSON.stringify([{ type: 'RSS', name: 'Feed', config: { url: 'https://x' } }]),
  })
  const r = validatePackFile('/p.json', fs)
  assert.equal(r.ok, true)
  assert.ok(!r.warnings.some((w) => /config\.feedUrl/i.test(w)))
})

// Per-type BUILTIN_CONNECTOR_FIELDS warn/accept cases: pack-builtin-fields-sync.test.mjs
