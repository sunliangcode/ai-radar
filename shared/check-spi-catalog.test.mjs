import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { healthyConnectorCatalog, healthyDeliveryCatalog } from './spi-catalog.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bin = join(root, 'shared/check-spi-catalog.mjs')

function run(kind, payload) {
  return spawnSync(process.execPath, [bin, kind, '-'], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  })
}

test('check-spi-catalog.mjs ok for healthy connector catalog', () => {
  const r = run('connectors', healthyConnectorCatalog())
  assert.equal(r.status, 0, r.stderr || r.stdout)
  assert.match(r.stdout, /OK:/)
})

test('check-spi-catalog.mjs fails when FIXTURE missing', () => {
  const rows = healthyConnectorCatalog().filter((r) => r.id !== 'FIXTURE')
  const r = run('connectors', rows)
  assert.notEqual(r.status, 0)
  assert.match(r.stderr + r.stdout, /FIXTURE missing/)
})

test('check-spi-catalog.mjs ok for built-in delivery catalog', () => {
  const r = run('delivery', healthyDeliveryCatalog())
  assert.equal(r.status, 0, r.stderr || r.stdout)
  assert.match(r.stdout, /OK:/)
})