/**
 * Keep package versions aligned (release.md policy).
 * Backend may use x.y.z-SNAPSHOT; others use plain x.y.z.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function pkgVersion(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8')).version
}

function pomBaseVersion() {
  const pom = readFileSync(join(root, 'backend/pom.xml'), 'utf8')
  // First <version> after <artifactId>backend</artifactId> (skip parent)
  const m = pom.match(/<artifactId>backend<\/artifactId>\s*<version>([^<]+)<\/version>/)
  assert.ok(m, 'backend pom version not found')
  return m[1].replace(/-SNAPSHOT$/, '')
}

test('frontend/cli/mcp package.json share the same version', () => {
  const fe = pkgVersion('frontend/package.json')
  const cli = pkgVersion('cli/package.json')
  const mcp = pkgVersion('mcp/package.json')
  assert.equal(cli, fe)
  assert.equal(mcp, fe)
})

test('backend pom base version matches package.json (SNAPSHOT stripped)', () => {
  const base = pomBaseVersion()
  const fe = pkgVersion('frontend/package.json')
  assert.equal(base, fe, `pom base ${base} vs frontend ${fe}`)
})

test('MCP server metadata version matches mcp/package.json', () => {
  const expected = pkgVersion('mcp/package.json')
  const src = readFileSync(join(root, 'mcp/server.mjs'), 'utf8')
  const m = src.match(/version:\s*pkgVersion\b/) || src.match(/version:\s*['"]([^'"]+)['"]/)
  assert.ok(m, 'mcp/server.mjs version binding not found')
  if (m[1]) assert.equal(m[1], expected)
})

test('frontend/cli/mcp declare engines.node >=20.19.0', () => {
  for (const rel of ['frontend/package.json', 'cli/package.json', 'mcp/package.json']) {
    const eng = JSON.parse(readFileSync(join(root, rel), 'utf8')).engines?.node
    assert.equal(eng, '>=20.19.0', `${rel} engines.node`)
  }
  const nvm = readFileSync(join(root, '.nvmrc'), 'utf8').trim()
  assert.match(nvm, /^20(\.19)?$/, `.nvmrc should pin Node 20.19+ (got ${nvm})`)
})

test('radar.api.version in application.yml matches package.json', () => {
  const fe = pkgVersion('frontend/package.json')
  const yml = readFileSync(join(root, 'backend/src/main/resources/application.yml'), 'utf8')
  const m = yml.match(/api:\s*\n\s*version:\s*([^\s#]+)/)
  assert.ok(m, 'radar.api.version missing in application.yml')
  assert.equal(m[1], fe, `application.yml api.version ${m[1]} vs frontend ${fe}`)
})

test('CITATION.cff version matches package.json', () => {
  const fe = pkgVersion('frontend/package.json')
  const cff = readFileSync(join(root, 'CITATION.cff'), 'utf8')
  const m = cff.match(/^version:\s*(.+)$/m)
  assert.ok(m, 'CITATION.cff version missing')
  assert.equal(m[1].trim(), fe)
})

test('HealthController exposes radar.api.version via RadarProperties', () => {
  const src = readFileSync(
    join(root, 'backend/src/main/java/com/airadar/api/HealthController.java'),
    'utf8',
  )
  assert.match(src, /put\("version",\s*properties\.getApi\(\)\.getVersion\(\)\)/)
  const props = readFileSync(
    join(root, 'backend/src/main/java/com/airadar/config/RadarProperties.java'),
    'utf8',
  )
  assert.match(props, /class Api\b/)
  assert.match(props, /private String version/)
})

test('frontend/cli/mcp package.json declare homepage + bugs', () => {
  for (const rel of ['frontend/package.json', 'cli/package.json', 'mcp/package.json']) {
    const pkg = JSON.parse(readFileSync(join(root, rel), 'utf8'))
    assert.match(pkg.homepage || '', /github\.com\/sunliangcode\/ai-radar/, `${rel} homepage`)
    assert.match(pkg.bugs?.url || '', /\/issues$/, `${rel} bugs.url`)
    assert.ok(Array.isArray(pkg.keywords) && pkg.keywords.includes('ai-radar'), `${rel} keywords`)
  }
})
