/**
 * Product a11y baseline must stay wired (focus trap, modal semantics, reduced motion).
 * Not a full axe suite — gates the primitives called out in docs/product-principles.md.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const REQUIRED_FILES = [
  'docs/product-principles.md',
  'frontend/src/lib/a11y.ts',
  'frontend/src/components/layout/useFocusTrap.ts',
  'frontend/src/components/primitives/ConfirmDialog.tsx',
  'frontend/src/index.css',
]

test('a11y baseline files exist', () => {
  const missing = REQUIRED_FILES.filter((rel) => !existsSync(join(root, rel)))
  assert.deepEqual(missing, [], `missing: ${missing.join(', ')}`)
})

test('product-principles documents Accessibility & i18n', () => {
  const md = readFileSync(join(root, 'docs/product-principles.md'), 'utf8')
  assert.match(md, /## Accessibility & i18n/)
  assert.match(md, /prefers-reduced-motion/)
  assert.match(md, /aria-\*/)
})

test('a11y helpers expose modal + reduced-motion checks', () => {
  const src = readFileSync(join(root, 'frontend/src/lib/a11y.ts'), 'utf8')
  assert.match(src, /export function isAriaModalOpen/)
  assert.match(src, /export function prefersReducedMotion/)
  assert.match(src, /aria-modal/)
  assert.match(src, /prefers-reduced-motion/)
})

test('ConfirmDialog is modal with dialog/alertdialog + focus trap', () => {
  const src = readFileSync(join(root, 'frontend/src/components/primitives/ConfirmDialog.tsx'), 'utf8')
  assert.match(src, /useFocusTrap/)
  assert.match(src, /aria-modal=["']true["']/)
  assert.match(src, /alertdialog/)
  assert.match(src, /role=\{danger \? 'alertdialog' : 'dialog'\}/)
})

test('global CSS respects prefers-reduced-motion', () => {
  const css = readFileSync(join(root, 'frontend/src/index.css'), 'utf8')
  assert.match(css, /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/)
})
