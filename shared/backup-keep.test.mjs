/**
 * BACKUP_KEEP validation in scripts/backup.sh (no live database required).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const script = join(root, 'scripts/backup.sh')
const missingDb = join(root, 'data/does-not-exist-radar.db')

function run(keep) {
  return spawnSync('bash', [script], {
    env: { ...process.env, BACKUP_KEEP: keep, AI_RADAR_DB: missingDb },
    encoding: 'utf8',
  })
}

test('backup.sh accepts whitespace-padded BACKUP_KEEP', () => {
  const r = run('  14  ')
  assert.equal(r.status, 1)
  assert.doesNotMatch(r.stderr, /invalid/)
  assert.match(r.stderr, /database not found/)
})

test('backup.sh rejects non-numeric BACKUP_KEEP', () => {
  const r = run('nope')
  assert.equal(r.status, 1)
  assert.match(r.stderr, /invalid — using 14/)
})

test('backup.sh rejects whitespace-only BACKUP_KEEP', () => {
  const r = run('   ')
  assert.equal(r.status, 1)
  assert.match(r.stderr, /invalid — using 14/)
})
