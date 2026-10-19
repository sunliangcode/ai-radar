/**
 * Built-in DeliveryChannel beans must match docs/extending-delivery.md table.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BUILTIN_DELIVERY_SETTINGS } from './spi-catalog.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const deliveryDir = join(root, 'backend/src/main/java/com/airadar/delivery')
const docPath = join(root, 'docs/extending-delivery.md')
function beans() {
  /** @type {Map<string, string>} channel -> class */
  const map = new Map()
  /** @type {Map<string, string[]>} */
  const owners = new Map()
  for (const f of readdirSync(deliveryDir)) {
    if (!f.endsWith('Delivery.java') || f === 'DeliveryChannel.java' || f === 'DeliveryService.java') {
      continue
    }
    const text = readFileSync(join(deliveryDir, f), 'utf8')
    if (!/implements\s+DeliveryChannel/.test(text)) continue
    const ch = text.match(/return\s+"([a-z0-9-]+)"\s*;/)
    assert.ok(ch, `${f}: missing return "channel-id" in channel()`)
    const cls = f.replace(/\.java$/, '')
    map.set(ch[1], cls)
    const files = owners.get(ch[1]) ?? []
    files.push(cls)
    owners.set(ch[1], files)
  }
  const duplicates = [...owners.entries()].filter(([, files]) => files.length > 1)
  assert.deepEqual(duplicates, [], 'two channels must not share channel() — catalog last-wins')
  return map
}

function docsTable() {
  const text = readFileSync(docPath, 'utf8')
  const section = text.match(/## Built-in channels\n\n([\s\S]*?)\n## /)
  assert.ok(section, 'Built-in channels section not found in extending-delivery.md')
  /** @type {Map<string, string>} */
  const map = new Map()
  for (const line of section[1].split('\n')) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/)
    if (m) map.set(m[1], m[2])
  }
  return map
}

test('built-in outbox delivery channel is present', () => {
  const fromCode = beans()
  assert.ok(fromCode.has('outbox'), 'OutboxDelivery must remain — doctor/smoke/Settings expect channel id outbox')
})

test('built-in delivery beans expose every BUILTIN_DELIVERY_SETTINGS key', () => {
  const classByChannel = beans()
  for (const [channelId, settingsKey] of BUILTIN_DELIVERY_SETTINGS) {
    const cls = classByChannel.get(channelId)
    assert.ok(cls, `missing DeliveryChannel bean for ${channelId}`)
    const text = readFileSync(join(deliveryDir, `${cls}.java`), 'utf8')
    assert.ok(
      text.includes(`"${settingsKey}"`),
      `${cls} must keep settings key ${settingsKey} — doctor/smoke/Settings expect it`,
    )
  }
})
test('extending-delivery.md required settingsKeys cover BUILTIN_DELIVERY_SETTINGS', () => {
  const text = readFileSync(docPath, 'utf8')
  const section = text.match(/## Built-in channels\n\n([\s\S]*?)\n## /)
  assert.ok(section, 'Built-in channels section not found')
  /** @type {Map<string, string>} */
  const keysByChannel = new Map()
  for (const line of section[1].split('\n')) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*`[^`]+`\s*\|[^|]*\|\s*(.*?)\s*\|\s*$/)
    if (!m) continue
    keysByChannel.set(m[1], m[2])
  }
  for (const [channelId, settingsKey] of BUILTIN_DELIVERY_SETTINGS) {
    const cell = keysByChannel.get(channelId)
    assert.ok(cell, `extending-delivery.md missing row for ${channelId}`)
    assert.ok(
      cell.includes(`\`${settingsKey}\``),
      `extending-delivery.md ${channelId} row missing \`${settingsKey}\``,
    )
  }
})

test('delivery beans match extending-delivery.md built-in table', () => {
  const fromCode = beans()
  const fromDocs = docsTable()
  assert.ok(fromCode.size >= 4, `expected ≥4 delivery beans, got ${fromCode.size}`)
  assert.equal(fromDocs.size, fromCode.size, `docs ${fromDocs.size} vs beans ${fromCode.size}`)
  const missingInDocs = [...fromCode.entries()]
    .filter(([ch, cls]) => fromDocs.get(ch) !== cls)
    .map(([ch, cls]) => `${ch}→${cls}`)
  const missingInCode = [...fromDocs.entries()]
    .filter(([ch, cls]) => fromCode.get(ch) !== cls)
    .map(([ch, cls]) => `${ch}→${cls}`)
  assert.deepEqual(
    { missingInDocs, missingInCode },
    { missingInDocs: [], missingInCode: [] },
    'Update docs/extending-delivery.md or DeliveryChannel beans together'
  )
})

test('delivery descriptor id matches channel()', () => {
  for (const [ch, cls] of beans()) {
    const text = readFileSync(join(deliveryDir, `${cls}.java`), 'utf8')
    const desc = text.match(/DeliveryDescriptor\.of\(\s*"([^"]+)"/)
    assert.ok(desc, `${cls}: missing DeliveryDescriptor.of`)
    assert.equal(desc[1], ch, `${cls}: catalog id must equal channel()`)
  }
})

test('delivery settings keys are non-blank and unique', () => {
  for (const [ch, cls] of beans()) {
    const text = readFileSync(join(deliveryDir, `${cls}.java`), 'utf8')
    const lists = [...text.matchAll(/List\.of\(([\s\S]*?)\)/g)]
    assert.equal(lists.length, 1, `${cls}: expected one settings List.of`)
    const keys = [...lists[0][1].matchAll(/"([^"]*)"/g)].map((m) => m[1])
    const seen = new Set()
    for (const key of keys) {
      const trimmed = key.trim()
      assert.ok(trimmed, `${cls}: blank settings key`)
      const fold = trimmed.toLowerCase()
      assert.ok(!seen.has(fold), `${ch}: duplicate settings key ${fold}`)
      seen.add(fold)
    }
  }
})

test('each DeliveryChannel overrides descriptor() with a human displayName', () => {
  for (const f of readdirSync(deliveryDir)) {
    if (!f.endsWith('Delivery.java') || f === 'DeliveryChannel.java' || f === 'DeliveryService.java') {
      continue
    }
    const text = readFileSync(join(deliveryDir, f), 'utf8')
    if (!/implements\s+DeliveryChannel/.test(text)) continue
    assert.match(
      text,
      /DeliveryDescriptor\.of\(\s*"([^"]+)"\s*,\s*"([^"]+)"/,
      `${f}: override descriptor() with DeliveryDescriptor.of("id", "Display Name", …)`
    )
    const m = text.match(/DeliveryDescriptor\.of\(\s*"([^"]+)"\s*,\s*"([^"]+)"/)
    assert.notEqual(m[1], m[2], `${f}: displayName should differ from id for catalog UX`)
  }
})
