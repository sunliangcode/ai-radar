/**
 * Keep settingsHub health i18n keys for every BUILTIN_* issueKey in en.json + zh.json.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tsPath = join(root, 'frontend/src/lib/connectors.ts')

function parseIssueKeys(text, constName) {
  const body = text.match(new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\] as const`))
  assert.ok(body, `${constName} not found in connectors.ts`)
  const keys = []
  const re = /issueKey:\s*'([^']+)'/g
  let m
  while ((m = re.exec(body[1])) != null) keys.push(m[1])
  return keys
}

function settingsHubKeys(localePath) {
  const json = JSON.parse(readFileSync(localePath, 'utf8'))
  const hub = json.settingsHub
  assert.ok(hub && typeof hub === 'object', `${localePath} missing settingsHub`)
  return hub
}

test('en/zh settingsHub include every connector/delivery health issueKey', () => {
  const ts = readFileSync(tsPath, 'utf8')
  const connectorKeys = parseIssueKeys(ts, 'BUILTIN_CONNECTOR_FIELD_CHECKS')
  const deliveryKeys = parseIssueKeys(ts, 'BUILTIN_DELIVERY_SETTING_CHECKS')
  const extras = ['healthConnectorsMissingFixture', 'healthDeliveryMissingOutbox']
  const want = [...new Set([...extras, ...connectorKeys, ...deliveryKeys])]
  assert.ok(want.length >= 20, `expected many health keys, got ${want.length}`)

  for (const rel of ['frontend/src/i18n/locales/en.json', 'frontend/src/i18n/locales/zh.json']) {
    const hub = settingsHubKeys(join(root, rel))
    for (const key of want) {
      assert.equal(typeof hub[key], 'string', `${rel} missing settingsHub.${key}`)
      assert.ok(hub[key].trim(), `${rel} settingsHub.${key} is blank`)
    }
  }
})
