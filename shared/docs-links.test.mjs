/**
 * Relative markdown links in docs/ and key root markdown files must resolve on disk.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const docsDir = join(root, 'docs')

const ROOT_MD = [
  'README.md',
  'README.zh.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'SUPPORT.md',
  'CODE_OF_CONDUCT.md',
  'SKILL.md',
  'AGENTS.md',
  'CHANGELOG.md',
  'scripts/README.md',
  'examples/README.md',
  'shared/README.md',
  'skills/README.md',
]

function mdFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...mdFiles(p))
    else if (name.endsWith('.md')) out.push(p)
  }
  return out
}

function collectBroken(files) {
  const broken = []
  for (const file of files) {
    if (!existsSync(file)) {
      broken.push(`missing file under scan: ${file}`)
      continue
    }
    const text = readFileSync(file, 'utf8')
    const base = dirname(file)
    for (const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      let target = m[1].trim()
      if (!target || target.startsWith('http') || target.startsWith('mailto:') || target.startsWith('#')) {
        continue
      }
      target = target.split('#')[0].split('?')[0]
      if (!target) continue
      const abs = normalize(resolve(base, target))
      if (!existsSync(abs)) {
        broken.push(`${file.replace(root + '/', '')} → ${m[1]}`)
      }
    }
  }
  return broken
}

test('docs/*.md relative links resolve', () => {
  assert.deepEqual(collectBroken(mdFiles(docsDir)), [])
})

test('root and package README relative links resolve', () => {
  const files = ROOT_MD.map((f) => join(root, f))
  assert.deepEqual(collectBroken(files), [])
})
