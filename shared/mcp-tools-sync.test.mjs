/**
 * docs/mcp.md tool tables must list every tool registered in mcp/server.mjs.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function toolsFromServer() {
  const src = readFileSync(join(root, 'mcp/server.mjs'), 'utf8')
  const names = []
  for (const m of src.matchAll(/name:\s*'((?:list|get|run|probe)_[a-z0-9_]+)'/g)) {
    names.push(m[1])
  }
  return [...new Set(names)]
}

function toolsFromDocs() {
  const md = readFileSync(join(root, 'docs/mcp.md'), 'utf8')
  // Only the "## Tools" section (stop at next ##) — skip error-code tables later.
  const section = md.match(/## Tools\n([\s\S]*?)\n## /)
  assert.ok(section, '## Tools section not found in docs/mcp.md')
  const names = []
  for (const m of section[1].matchAll(/^\|\s*`((?:list|get|run|probe)_[a-z0-9_]+)`\s*\|/gm)) {
    names.push(m[1])
  }
  return [...new Set(names)]
}

test('docs/mcp.md tool table matches mcp/server.mjs registrations', () => {
  const code = toolsFromServer().sort()
  const docs = toolsFromDocs().sort()
  assert.ok(code.length >= 10, `expected many MCP tools, got ${code.length}`)
  const missingInDocs = code.filter((t) => !docs.includes(t))
  const extraInDocs = docs.filter((t) => !code.includes(t))
  assert.deepEqual(
    { missingInDocs, extraInDocs },
    { missingInDocs: [], extraInDocs: [] },
    'Update docs/mcp.md Tools tables when adding/removing MCP tools'
  )
})
