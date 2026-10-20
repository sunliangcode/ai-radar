/**
 * JobsController mutating/read paths must stay documented in docs/api.md
 * and mirrored in frontend/src/lib/api.ts (SPA product surface).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Paths under /api/jobs from JobsController mappings. */
function jobsPathsFromController() {
  const src = readFileSync(
    join(root, 'backend/src/main/java/com/airadar/api/JobsController.java'),
    'utf8',
  )
  assert.match(src, /@RequestMapping\("\/api\/jobs"\)/)
  const paths = []
  for (const m of src.matchAll(
    /@(Get|Post|Put|Patch|Delete)Mapping\(\s*"([^"]+)"\s*\)/g,
  )) {
    paths.push(`/api/jobs${m[2]}`)
  }
  // class-level mapping alone has no empty GetMapping — require known set
  return [...new Set(paths)].sort()
}

test('JobsController paths appear in docs/api.md', () => {
  const paths = jobsPathsFromController()
  assert.ok(paths.length >= 6, `expected several job paths, got ${paths.length}`)
  const md = readFileSync(join(root, 'docs/api.md'), 'utf8')
  const missing = paths.filter((p) => !md.includes(`\`${p}\``) && !md.includes(p))
  assert.deepEqual(missing, [], `document in docs/api.md: ${missing.join(', ')}`)
})

test('SPA api.ts covers job fetch/push/progress/cleanup surfaces', () => {
  const api = readFileSync(join(root, 'frontend/src/lib/api.ts'), 'utf8')
  const required = [
    '/api/jobs/fetch',
    '/api/jobs/fetch/progress',
    '/api/jobs/push',
    '/api/jobs/impact',
    '/api/jobs/cleanup',
    '/api/jobs/cleanup-duplicate-titles',
    '/api/jobs/schedule',
  ]
  const missing = required.filter((p) => !api.includes(p))
  assert.deepEqual(missing, [], `add client methods for: ${missing.join(', ')}`)
})

test('docs/api.md documents decision withdraw + feedback undo', () => {
  const md = readFileSync(join(root, 'docs/api.md'), 'utf8')
  assert.match(md, /DELETE.*\/api\/decisions\/\{id\}|`\/api\/decisions\/\{id\}`/)
  assert.match(md, /DELETE.*\/api\/feedback|`\/api\/feedback`/)
})
