/**
 * JSON.parse keeps the last duplicate key silently — gate locale files against that.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = join(root, 'frontend/src/i18n/locales')

/**
 * @param {string} text
 * @returns {string[]} duplicate object keys (may repeat if seen >2 times)
 */
export function findDuplicateJsonKeys(text) {
  const dups = []
  /** @type {Record<string, number>[]} */
  const keyStacks = [{}]
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (c === '"') {
      let j = i + 1
      let esc = false
      while (j < text.length) {
        if (esc) esc = false
        else if (text[j] === '\\') esc = true
        else if (text[j] === '"') break
        j++
      }
      const key = text.slice(i + 1, j)
      let k = j + 1
      while (k < text.length && /\s/.test(text[k])) k++
      if (text[k] === ':') {
        const bag = keyStacks[keyStacks.length - 1]
        bag[key] = (bag[key] ?? 0) + 1
        if (bag[key] === 2) dups.push(key)
      }
      i = j
    } else if (c === '{' || c === '[') {
      keyStacks.push({})
    } else if (c === '}' || c === ']') {
      if (keyStacks.length > 1) keyStacks.pop()
    }
    i++
  }
  return dups
}

test('frontend locale JSON files have no duplicate object keys', () => {
  const files = readdirSync(localesDir).filter((f) => f.endsWith('.json'))
  assert.ok(files.length >= 2, 'expected en.json + zh.json')
  for (const f of files) {
    const text = readFileSync(join(localesDir, f), 'utf8')
    const dups = findDuplicateJsonKeys(text)
    assert.deepEqual(dups, [], `${f} has duplicate keys: ${dups.join(', ')}`)
  }
})
