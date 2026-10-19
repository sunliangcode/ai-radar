#!/usr/bin/env node
/**
 * CLI wrapper for connectorCatalogCheck / deliveryCatalogCheck.
 * Usage: node shared/check-spi-catalog.mjs <connectors|delivery> <json-file|->
 * Reads JSON array from file path or stdin when path is "-".
 * Exit 0 on ok; exit 1 on warn/error/invalid (prints detail).
 */
import { readFileSync } from 'node:fs'
import { connectorCatalogCheck, deliveryCatalogCheck } from './spi-catalog.mjs'

const kind = process.argv[2]
const src = process.argv[3] ?? '-'
if (kind !== 'connectors' && kind !== 'delivery') {
  console.error('usage: check-spi-catalog.mjs <connectors|delivery> <json-file|->')
  process.exit(2)
}

let raw
try {
  raw = src === '-' ? readFileSync(0, 'utf8') : readFileSync(src, 'utf8')
} catch (e) {
  console.error(`failed to read ${src}: ${e?.message || e}`)
  process.exit(1)
}

let rows
try {
  rows = JSON.parse(raw)
} catch (e) {
  console.error(`invalid JSON: ${e?.message || e}`)
  process.exit(1)
}

const r = kind === 'connectors' ? connectorCatalogCheck(rows) : deliveryCatalogCheck(rows)
if (r == null) {
  console.error(`${kind}: expected a JSON array`)
  process.exit(1)
}
if (r.level !== 'ok') {
  console.error(`${kind}: ${r.detail}`)
  process.exit(1)
}
console.log(`OK: ${r.detail}`)
