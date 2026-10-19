/**
 * Keep Argos pin aligned across requirements.txt and THIRD_PARTY_NOTICES.md.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('THIRD_PARTY_NOTICES Argos version matches requirements.txt', () => {
  const req = readFileSync(join(root, 'translate-service/requirements.txt'), 'utf8')
  const m = req.match(/^argostranslate==([^\s#]+)/m)
  assert.ok(m, 'argostranslate pin missing in requirements.txt')
  const ver = m[1]
  const notices = readFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8')
  assert.match(
    notices,
    new RegExp(`argostranslate[^\n]*${ver.replace(/\./g, '\\.')}`, 'i'),
    `THIRD_PARTY_NOTICES.md should mention argostranslate ${ver}`,
  )
})
