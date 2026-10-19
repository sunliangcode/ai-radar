/**
 * Keep en.json and zh.json leaf key sets identical (no orphan locale strings).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** @param {unknown} obj @param {string} [prefix] */
function leafKeys(obj, prefix = '') {
  /** @type {string[]} */
  const out = []
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefix) out.push(prefix)
    return out
  }
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k
    if (v != null && typeof v === 'object' && !Array.isArray(v)) out.push(...leafKeys(v, p))
    else out.push(p)
  }
  return out
}

test('en.json and zh.json share the same leaf key set', () => {
  const en = JSON.parse(readFileSync(join(root, 'frontend/src/i18n/locales/en.json'), 'utf8'))
  const zh = JSON.parse(readFileSync(join(root, 'frontend/src/i18n/locales/zh.json'), 'utf8'))
  const ek = leafKeys(en).sort()
  const zk = leafKeys(zh).sort()
  const onlyEn = ek.filter((k) => !zk.includes(k))
  const onlyZh = zk.filter((k) => !ek.includes(k))
  assert.deepEqual(
    { onlyEn, onlyZh },
    { onlyEn: [], onlyZh: [] },
    'Update both locales together when adding/removing i18n keys',
  )
})
