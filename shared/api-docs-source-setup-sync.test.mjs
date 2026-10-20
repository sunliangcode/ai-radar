/**
 * Source setup API paths must stay documented and mirrored in the SPA client.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('docs/api.md documents CLI source setup endpoints', () => {
  const md = readFileSync(join(root, 'docs/api.md'), 'utf8')
  const paths = [
    '/api/sources/setup/batch',
    '/api/sources/{id}/setup',
    '/api/sources/{id}/setup/install',
    '/api/sources/{id}/setup/probe',
  ]
  const missing = paths.filter((p) => !md.includes(p))
  assert.deepEqual(missing, [], `document in docs/api.md: ${missing.join(', ')}`)
})

test('frontend api.ts covers CLI source setup client', () => {
  const api = readFileSync(join(root, 'frontend/src/lib/api.ts'), 'utf8')
  const required = [
    '/api/sources/setup/batch',
    '/api/sources/${id}/setup',
    '/api/sources/${id}/setup/install',
    '/api/sources/${id}/setup/probe',
  ]
  const missing = required.filter((p) => !api.includes(p))
  assert.deepEqual(missing, [], `add client methods for: ${missing.join(', ')}`)
})
