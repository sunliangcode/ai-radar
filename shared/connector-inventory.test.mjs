/**
 * Every SourceType except documented legacy gaps must have a SourceConnector bean.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOURCE_TYPES, LEGACY_SOURCE_TYPES } from './pack.mjs'
import { BUILTIN_CONNECTOR_PAIRS, connectorFieldType } from './spi-catalog.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const connectorDir = join(root, 'backend/src/main/java/com/airadar/connector')
const javaPath = join(root, 'backend/src/main/java/com/airadar/domain/SourceType.java')

function parseJavaEnum(text) {
  const body = text.match(/public\s+enum\s+SourceType\s*\{([\s\S]*?)\}/)
  assert.ok(body, 'SourceType.java enum body not found')
  const names = []
  for (const line of body[1].split('\n')) {
    const trimmed = line.replace(/\/\/.*$/, '').trim()
    if (!trimmed) continue
    const m = trimmed.match(/^([A-Z][A-Z0-9_]*)\s*[,;]?/)
    if (m) names.push(m[1])
  }
  return names
}

function connectorTypesFromBeans() {
  const types = new Set()
  /** @type {Map<string, string[]>} */
  const byType = new Map()
  for (const f of readdirSync(connectorDir)) {
    if (!f.endsWith('Connector.java')) continue
    const text = readFileSync(join(connectorDir, f), 'utf8')
    if (!/implements\s+SourceConnector/.test(text)) continue
    const m = text.match(/return\s+SourceType\.([A-Z][A-Z0-9_]*)\s*;/)
    assert.ok(m, `${f}: missing return SourceType.X in type()`)
    types.add(m[1])
    const owners = byType.get(m[1]) ?? []
    owners.push(f)
    byType.set(m[1], owners)
  }
  const duplicates = [...byType.entries()].filter(([, files]) => files.length > 1)
  assert.deepEqual(duplicates, [], 'two connectors must not share type() — registry last-wins')
  return types
}

test('LEGACY_SOURCE_TYPES are documented and subset of SOURCE_TYPES', () => {
  for (const t of LEGACY_SOURCE_TYPES) {
    assert.ok(SOURCE_TYPES.has(t), `legacy ${t} missing from SOURCE_TYPES`)
  }
  assert.ok(LEGACY_SOURCE_TYPES.has('JUEJIN'))
  assert.ok(LEGACY_SOURCE_TYPES.has('CSDN'))
})

test('each non-legacy SourceType has a connector bean', () => {
  const fromJava = parseJavaEnum(readFileSync(javaPath, 'utf8'))
  const beans = connectorTypesFromBeans()
  const missing = fromJava.filter((t) => !LEGACY_SOURCE_TYPES.has(t) && !beans.has(t))
  const unexpectedLegacy = [...LEGACY_SOURCE_TYPES].filter((t) => beans.has(t))
  assert.deepEqual(
    { missing, unexpectedLegacy },
    { missing: [], unexpectedLegacy: [] },
    'Add a *Connector bean for new SourceTypes, or mark intentional gaps in LEGACY_SOURCE_TYPES'
  )
})

test('built-in FIXTURE connector is present', () => {
  const beans = connectorTypesFromBeans()
  assert.ok(beans.has('FIXTURE'), 'FixtureConnector must remain — doctor/smoke/Settings expect type FIXTURE')
})

test('built-in connectors expose every BUILTIN_CONNECTOR_FIELDS ConfigField (+ FIXTURE/path)', () => {
  /** @type {Map<string, string>} type -> class file name */
  const classByType = new Map()
  for (const f of readdirSync(connectorDir)) {
    if (!f.endsWith('Connector.java')) continue
    const src = readFileSync(join(connectorDir, f), 'utf8')
    if (!/implements\s+SourceConnector/.test(src)) continue
    const m = src.match(/return\s+SourceType\.([A-Z][A-Z0-9_]*)\s*;/)
    assert.ok(m, `${f}: missing return SourceType.X`)
    classByType.set(m[1], f)
  }
  for (const [typeId, field] of BUILTIN_CONNECTOR_PAIRS) {
    const fieldType = connectorFieldType(field)
    const file = classByType.get(typeId)
    assert.ok(file, `missing SourceConnector bean for ${typeId}`)
    const src = readFileSync(join(connectorDir, file), 'utf8')
    const re = new RegExp(`ConfigField\\.${fieldType}\\(\\s*"${field}"`)
    assert.match(
      src,
      re,
      `${file} must keep ConfigField.${fieldType}("${field}") — doctor/smoke expect ${typeId}.${field}`,
    )
    if (fieldType === 'path') {
      assert.doesNotMatch(
        src,
        new RegExp(`ConfigField\\.(?:text|secret|textarea)\\(\\s*"${field}"`),
        `${typeId} ${field} must use ConfigField.path, not text/secret/textarea`,
      )
    }
  }
})

test('extending-connectors.md Notes name every BUILTIN_CONNECTOR_FIELDS key (+ FIXTURE path)', () => {
  const doc = readFileSync(join(root, 'docs/extending-connectors.md'), 'utf8')
  const section = doc.match(/## Built-in connector types\n\n([\s\S]*?)\n\n/)
  assert.ok(section, 'Built-in connector types section not found')
  /** @type {Map<string, string>} */
  const notesByType = new Map()
  for (const line of section[1].split('\n')) {
    const m = line.match(/^\|\s*`([A-Z][A-Z0-9_]*)`\s*\|[^|]*\|\s*(.*?)\s*\|\s*$/)
    if (m) notesByType.set(m[1], m[2])
  }
  for (const [typeId, field] of BUILTIN_CONNECTOR_PAIRS) {
    const notes = notesByType.get(typeId)
    assert.ok(notes, `extending-connectors.md missing row for ${typeId}`)
    const ok =
      notes.includes('`' + field + '`') || (typeId === 'FIXTURE' && /path/.test(notes))
    assert.ok(ok, `extending-connectors.md ${typeId} Notes missing \`${field}\``)
  }
})

function docsBuiltInTypes() {
  const text = readFileSync(join(root, 'docs/extending-connectors.md'), 'utf8')
  const section = text.match(/## Built-in connector types\n\n([\s\S]*?)\n\n/)
  assert.ok(section, 'Built-in connector types section not found')
  const types = []
  for (const line of section[1].split('\n')) {
    const m = line.match(/^\|\s*`([A-Z][A-Z0-9_]*)`\s*\|/)
    if (m) types.push(m[1])
  }
  return types
}

test('connector descriptor id matches type()', () => {
  for (const f of readdirSync(connectorDir)) {
    if (!f.endsWith('Connector.java')) continue
    const text = readFileSync(join(connectorDir, f), 'utf8')
    if (!/implements\s+SourceConnector/.test(text)) continue
    const type = text.match(/return\s+SourceType\.([A-Z][A-Z0-9_]*)\s*;/)
    const desc = text.match(/ConnectorDescriptor\.of\(\s*\n?\s*"([A-Z][A-Z0-9_]*)"/)
    assert.ok(type, `${f}: missing return SourceType.X`)
    assert.ok(desc, `${f}: descriptor() must start with ConnectorDescriptor.of("TYPE", …)`)
    assert.equal(desc[1], type[1], `${f}: catalog id must equal type()`)
  }
})

test('connector config field keys are non-blank and unique', () => {
  for (const f of readdirSync(connectorDir)) {
    if (!f.endsWith('Connector.java')) continue
    const text = readFileSync(join(connectorDir, f), 'utf8')
    if (!/implements\s+SourceConnector/.test(text)) continue
    const keys = [...text.matchAll(/ConfigField\.(?:text|path|secret|textarea)\(\s*"([^"]*)"/g)].map(
      (m) => m[1],
    )
    const seen = new Set()
    for (const key of keys) {
      const trimmed = key.trim()
      assert.ok(trimmed, `${f}: blank config field key`)
      const fold = trimmed.toLowerCase()
      assert.ok(!seen.has(fold), `${f}: duplicate config field key ${fold}`)
      seen.add(fold)
    }
  }
})

test('ConnectorRegistry CONFIG_FIELD_TYPES matches UI helpers', () => {
  const registry = readFileSync(join(connectorDir, 'ConnectorRegistry.java'), 'utf8')
  const ui = readFileSync(join(root, 'frontend/src/lib/connectors.ts'), 'utf8')
  assert.match(registry, /CONFIG_FIELD_TYPES = Set\.of\("text", "path", "secret", "textarea"\)/)
  assert.match(ui, /CONNECTOR_CONFIG_FIELD_TYPES = \['text', 'path', 'secret', 'textarea'\]/)
  assert.match(
    readFileSync(join(connectorDir, 'ConnectorDescriptor.java'), 'utf8'),
    /public static ConfigField textarea\(/,
  )
})

test('extending-connectors.md built-in table matches connector beans', () => {
  const beans = [...connectorTypesFromBeans()].sort()
  const docs = docsBuiltInTypes().sort()
  assert.deepEqual(
    docs,
    beans,
    'Update docs/extending-connectors.md Built-in table when adding/removing connectors'
  )
})
