/**
 * Keep shared/pack.mjs SOURCE_TYPES aligned with backend SourceType.java.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOURCE_TYPES } from './pack.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
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

test('SOURCE_TYPES matches SourceType.java', () => {
  const java = readFileSync(javaPath, 'utf8')
  const fromJava = parseJavaEnum(java)
  assert.ok(fromJava.length >= 10, `expected many SourceType values, got ${fromJava.length}`)
  const javaSet = new Set(fromJava)
  const missingInJs = fromJava.filter((t) => !SOURCE_TYPES.has(t))
  const extraInJs = [...SOURCE_TYPES].filter((t) => !javaSet.has(t))
  assert.deepEqual(
    { missingInJs, extraInJs },
    { missingInJs: [], extraInJs: [] },
    'Update shared/pack.mjs SOURCE_TYPES when changing SourceType.java'
  )
})
