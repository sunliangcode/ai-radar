/**
 * Agent skill copies must keep the same core ops surface as root SKILL.md.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const REQUIRED = ['doctor', 'home', 'connectors', 'delivery-channels', 'pack']

const COPIES = [
  'SKILL.md',
  'skills/claude-code/SKILL.md',
  'skills/codex/SKILL.md',
  'skills/gemini-cli/README.md',
]

const PLATFORM = [
  'skills/claude-code/SKILL.md',
  'skills/codex/SKILL.md',
  'skills/gemini-cli/README.md',
]

test('root SKILL.md and platform copies mention core CLI surface', () => {
  for (const rel of COPIES) {
    const path = join(root, rel)
    assert.ok(existsSync(path), `missing ${rel}`)
    const text = readFileSync(path, 'utf8')
    for (const token of REQUIRED) {
      assert.match(text, new RegExp(token), `${rel} should mention \`${token}\``)
    }
  }
})

test('platform skill copies mention MCP get_health', () => {
  for (const rel of PLATFORM) {
    const text = readFileSync(join(root, rel), 'utf8')
    assert.match(text, /get_health/, `${rel} should mention get_health`)
  }
})

test('platform skill copies mention MCP probe_llm', () => {
  for (const rel of PLATFORM) {
    const text = readFileSync(join(root, rel), 'utf8')
    assert.match(text, /probe_llm/, `${rel} should mention probe_llm`)
  }
})

test('platform skill copies mention MCP SPI catalogs', () => {
  for (const rel of PLATFORM) {
    const text = readFileSync(join(root, rel), 'utf8')
    assert.match(text, /list_connectors/, `${rel} should mention list_connectors`)
    assert.match(text, /list_delivery_channels/, `${rel} should mention list_delivery_channels`)
  }
})

test('root SKILL.md mentions MCP SPI catalogs', () => {
  const text = readFileSync(join(root, 'SKILL.md'), 'utf8')
  assert.match(text, /list_connectors/)
  assert.match(text, /list_delivery_channels/)
})

test('skills/README.md points at platform copies', () => {
  const readme = readFileSync(join(root, 'skills/README.md'), 'utf8')
  assert.match(readme, /claude-code/)
  assert.match(readme, /codex/)
  assert.match(readme, /gemini-cli/)
  assert.match(readme, /SKILL\.md/)
})
