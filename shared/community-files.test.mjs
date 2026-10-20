/**
 * Community-health + product-norm docs must stay present (GitHub / OSS checklist).
 * Link resolution is covered by docs-links.test.mjs; this asserts existence only.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const REQUIRED = [
  'LICENSE',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'SUPPORT.md',
  'PRIVACY.md',
  'GOVERNANCE.md',
  'MAINTAINERS',
  'CHANGELOG.md',
  'CITATION.cff',
  'THIRD_PARTY_NOTICES.md',
  'docs/product-principles.md',
  'docs/release.md',
  '.github/CODEOWNERS',
  '.github/pull_request_template.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/docs.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/dependabot.yml',
  '.github/workflows/codeql.yml',
  '.github/workflows/dependency-review.yml',
]

test('required community-health and product-norm files exist', () => {
  const missing = REQUIRED.filter((rel) => !existsSync(join(root, rel)))
  assert.deepEqual(missing, [], `missing: ${missing.join(', ')}`)
})

test('release checklist and bug template surface PRIVACY', () => {
  const release = readFileSync(join(root, 'docs/release.md'), 'utf8')
  const bug = readFileSync(join(root, '.github/ISSUE_TEMPLATE/bug_report.yml'), 'utf8')
  assert.match(release, /PRIVACY\.md/)
  assert.match(release, /GOVERNANCE\.md/)
  assert.match(bug, /PRIVACY\.md/)
  assert.match(bug, /LOCAL_TOKEN|cookies/i)
})

test('SECURITY documents Dependabot, CodeQL, and dependency review', () => {
  const security = readFileSync(join(root, 'SECURITY.md'), 'utf8')
  assert.match(security, /dependabot\.yml/)
  assert.match(security, /codeql\.yml/)
  assert.match(security, /dependency-review\.yml/)
})

test('product-principles checklist covers Undo and empty states', () => {
  const md = readFileSync(join(root, 'docs/product-principles.md'), 'utf8')
  assert.match(md, /Reversible mutations/)
  assert.match(md, /True empty/)
  assert.match(md, /Not found \(404\)/)
  assert.match(md, /Pull-to-refresh/)
})
