import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CONNECTOR_CONFIG_FIELD_TYPES,
  BUILTIN_CONNECTOR_FIELDS,
  BUILTIN_CONNECTOR_PAIRS,
  BUILTIN_DELIVERY_SETTINGS,
  connectorCatalogCheck,
  deliveryCatalogCheck,
  connectorFieldType,
  formatBuiltinConnectorExpect,
  formatBuiltinConnectorTicks,
  formatBuiltinDeliveryExpect,
  formatBuiltinDeliveryTicks,
  healthyConnectorCatalog,
  healthyDeliveryCatalog,
} from './spi-catalog.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('CONNECTOR_CONFIG_FIELD_TYPES matches ConnectorRegistry allowlist', () => {
  const java = readFileSync(
    join(root, 'backend/src/main/java/com/airadar/connector/ConnectorRegistry.java'),
    'utf8',
  )
  assert.match(java, /CONFIG_FIELD_TYPES = Set\.of\("text", "path", "secret", "textarea"\)/)
  assert.deepEqual([...CONNECTOR_CONFIG_FIELD_TYPES].sort(), ['path', 'secret', 'text', 'textarea'])
})

test('connectorFieldType maps path keys and defaults to text', () => {
  assert.equal(connectorFieldType('path'), 'path')
  assert.equal(connectorFieldType('cliPath'), 'path')
  assert.equal(connectorFieldType('feedUrl'), 'text')
  assert.equal(connectorFieldType('query'), 'text')
})

test('BUILTIN_CONNECTOR_PAIRS is FIXTURE/path plus BUILTIN_CONNECTOR_FIELDS', () => {
  assert.deepEqual(BUILTIN_CONNECTOR_PAIRS[0], ['FIXTURE', 'path'])
  assert.equal(BUILTIN_CONNECTOR_PAIRS.length, 1 + BUILTIN_CONNECTOR_FIELDS.length)
  assert.deepEqual(BUILTIN_CONNECTOR_PAIRS.slice(1), [...BUILTIN_CONNECTOR_FIELDS])
})

test('formatBuiltin*Expect joins slash pairs from BUILTIN tables', () => {
  const conn = formatBuiltinConnectorExpect()
  assert.match(conn, /^FIXTURE\/path,/)
  assert.match(conn, /BILIBILI\/cliPath$/)
  assert.equal(conn.split(', ').length, BUILTIN_CONNECTOR_PAIRS.length)
  const del = formatBuiltinDeliveryExpect()
  assert.match(del, /^outbox\/radar\.delivery\.outbox-enabled,/)
  assert.match(del, /feishu\/FEISHU_WEBHOOK_URL$/)
  assert.equal(del.split(', ').length, BUILTIN_DELIVERY_SETTINGS.length)
})

test('formatBuiltin*Ticks wraps markdown ticks around the same pairs', () => {
  assert.equal(
    formatBuiltinConnectorTicks(),
    BUILTIN_CONNECTOR_PAIRS.map(([id, field]) => `\`${id}\`/\`${field}\``).join(', '),
  )
  assert.equal(
    formatBuiltinDeliveryTicks(),
    BUILTIN_DELIVERY_SETTINGS.map(([id, key]) => `\`${id}\`/\`${key}\``).join(', '),
  )
})

test('connectorCatalogCheck ok for sorted catalog with FIXTURE', () => {
  const rows = healthyConnectorCatalog()
  assert.equal(rows.length, BUILTIN_CONNECTOR_PAIRS.length)
  const r = connectorCatalogCheck(rows)
  assert.equal(r.level, 'ok')
  assert.match(r.detail, new RegExp(`${rows.length} connectors`))
  assert.match(r.detail, /built-in config fields/)
})


test('connectorCatalogCheck warns on unknown field type and missing FIXTURE', () => {
  const rows = healthyConnectorCatalog()
    .filter((row) => row.id !== 'FIXTURE')
    .map((row, i) =>
      i === 0 ? { ...row, configFields: [{ key: 'n', type: 'number' }] } : row,
    )
  const r = connectorCatalogCheck(rows)
  assert.equal(r.level, 'warn')
  assert.match(r.detail, /unknown config field type number/)
  assert.match(r.detail, /FIXTURE missing/)
})

test('connectorCatalogCheck warns when FIXTURE path field has wrong type', () => {
  const rows = healthyConnectorCatalog({
    FIXTURE: [{ key: 'path', type: 'text' }],
  })
  const r = connectorCatalogCheck(rows)
  assert.equal(r.level, 'warn')
  assert.match(r.detail, /FIXTURE path field type must be path/)
})

test('connectorCatalogCheck warns when each BUILTIN field is stripped', () => {
  for (const [typeId, field] of BUILTIN_CONNECTOR_PAIRS) {
    const rows = healthyConnectorCatalog({ [typeId]: [] })
    const r = connectorCatalogCheck(rows)
    assert.equal(r.level, 'warn', typeId)
    assert.match(r.detail, new RegExp(`${typeId} missing config field ${field}`))
  }
})

test('deliveryCatalogCheck ok for sorted catalog', () => {
  const rows = healthyDeliveryCatalog()
  assert.equal(rows.length, new Set(BUILTIN_DELIVERY_SETTINGS.map(([id]) => id)).size)
  const r = deliveryCatalogCheck(rows)
  assert.equal(r.level, 'ok')
  assert.match(r.detail, new RegExp(`${rows.length} delivery channels`))
  assert.match(r.detail, /built-in settings keys/)
})
test('deliveryCatalogCheck warns when unsorted', () => {
  const rows = healthyDeliveryCatalog().reverse()
  const r = deliveryCatalogCheck(rows)
  assert.equal(r.level, 'warn')
  assert.match(r.detail, /not sorted by id/)
})

test('deliveryCatalogCheck warns when outbox missing', () => {
  const rows = [
    ...healthyDeliveryCatalog().filter((row) => row.id !== 'outbox'),
    { id: 'slack', displayName: 'Slack', settingsKeys: [] },
  ].sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: 'base' }))
  const r = deliveryCatalogCheck(rows)
  assert.equal(r.level, 'warn')
  assert.match(r.detail, /outbox missing/)
})

test('deliveryCatalogCheck warns when each BUILTIN_DELIVERY_SETTINGS key is stripped', () => {
  for (const [channelId, settingsKey] of BUILTIN_DELIVERY_SETTINGS) {
    const overrides = {}
    if (channelId === 'email') {
      const other = settingsKey === 'SMTP_HOST' ? ['SMTP_TO'] : ['SMTP_HOST']
      overrides.email = other
    } else {
      overrides[channelId] = []
    }
    const r = deliveryCatalogCheck(healthyDeliveryCatalog(overrides))
    assert.equal(r.level, 'warn', `${channelId}/${settingsKey}`)
    assert.match(
      r.detail,
      new RegExp(`${channelId} missing settings key ${settingsKey.replace(/\./g, '\\.')}`),
    )
  }
})

test('connectorCatalogCheck warns on surrounding whitespace', () => {
  const rows = healthyConnectorCatalog().map((row) => {
    if (row.id === 'FIXTURE') return { ...row, id: ' FIXTURE ' }
    if (row.id === 'RSS') {
      return {
        ...row,
        displayName: ' Name ',
        configFields: [{ key: ' path ', type: ' path ' }],
      }
    }
    return row
  })
  rows.sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: 'base' }))
  const r = connectorCatalogCheck(rows)
  assert.equal(r.level, 'warn')
  assert.match(r.detail, /connector id has surrounding whitespace/)
  assert.match(r.detail, /displayName has surrounding whitespace/)
  assert.match(r.detail, /config field key has surrounding whitespace/)
  assert.match(r.detail, /config field type has surrounding whitespace/)
})

test('deliveryCatalogCheck warns on surrounding whitespace', () => {
  const rows = healthyDeliveryCatalog().map((row) => {
    if (row.id === 'email') return { ...row, id: ' email ', settingsKeys: [] }
    if (row.id === 'feishu') {
      return { ...row, displayName: ' Feishu ', settingsKeys: [' KEY '] }
    }
    return row
  })
  const r = deliveryCatalogCheck(rows)
  assert.equal(r.level, 'warn')
  assert.match(r.detail, /delivery id has surrounding whitespace/)
  assert.match(r.detail, /displayName has surrounding whitespace/)
  assert.match(r.detail, /settings key has surrounding whitespace/)
})

test('cli doctor uses shared spi-catalog helper', () => {
  const cli = readFileSync(join(root, 'cli/ai-radar.mjs'), 'utf8')
  assert.match(cli, /connectorCatalogCheck/)
  assert.match(cli, /deliveryCatalogCheck/)
})
