/**
 * Keep Dockerfile Node major aligned with .nvmrc / engines.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('Dockerfile frontend stage uses Node 20 (matches .nvmrc)', () => {
  const df = readFileSync(join(root, 'Dockerfile'), 'utf8')
  const m = df.match(/FROM\s+node:(\d+)/)
  assert.ok(m, 'Dockerfile missing FROM node:N')
  assert.equal(m[1], '20', `Dockerfile Node ${m[1]} — keep in sync with .nvmrc / engines`)
  assert.match(df, /COPY --from=backend .*backend-\*\.jar/, 'use backend-*.jar wildcard (not a hardcoded version)')
  assert.match(df, /HEALTHCHECK/, 'Dockerfile should declare HEALTHCHECK for compose-less runs')
})

test('CI and release workflows pin Node via .nvmrc', () => {
  for (const rel of ['.github/workflows/ci.yml', '.github/workflows/release.yml']) {
    const yml = readFileSync(join(root, rel), 'utf8')
    assert.match(yml, /node-version-file:\s*\.nvmrc/, `${rel} should use node-version-file: .nvmrc`)
    assert.doesNotMatch(
      yml,
      /node-version:\s*["']?\d+/,
      `${rel} should not hardcode node-version (use .nvmrc)`,
    )
  }
})

test('CI workflow declares least-privilege contents: read', () => {
  const yml = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8')
  assert.match(yml, /permissions:\s*\n\s*contents:\s*read/)
})

test('Dependabot covers docker for root and translate-service', () => {
  const yml = readFileSync(join(root, '.github/dependabot.yml'), 'utf8')
  assert.match(yml, /package-ecosystem:\s*docker/)
  assert.match(yml, /directory:\s*"\/"/)
  assert.match(yml, /directory:\s*"\/translate-service"/)
})

test('Dependabot covers pip for translate-service', () => {
  const yml = readFileSync(join(root, '.github/dependabot.yml'), 'utf8')
  assert.match(yml, /package-ecosystem:\s*pip/)
  assert.match(yml, /directory:\s*"\/translate-service"/)
})

test('compose ai-radar healthcheck hits /api/health', () => {
  const compose = readFileSync(join(root, 'docker-compose.yml'), 'utf8')
  assert.match(compose, /\/api\/health/)
})

test('.dockerignore excludes Python cache and frontend coverage', () => {
  const ig = readFileSync(join(root, '.dockerignore'), 'utf8')
  assert.match(ig, /__pycache__/)
  assert.match(ig, /frontend\/coverage/)
})

test('.gitignore excludes Python cache', () => {
  const ig = readFileSync(join(root, '.gitignore'), 'utf8')
  assert.match(ig, /__pycache__/)
  assert.match(ig, /\*\.pyc/)
})

test('release workflow marks GitHub Release as latest', () => {
  const yml = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8')
  assert.match(yml, /make_latest:\s*true/)
  assert.match(yml, /draft:\s*false/)
  assert.match(yml, /prerelease:/)
  assert.match(yml, /concurrency:/)
  assert.match(yml, /cliVersion/)
  assert.match(yml, /health-llm/)
  assert.match(yml, /modelPresent/)
  assert.match(yml, /AI_RADAR_DB/)
  assert.match(yml, /BACKUP_KEEP/)
  assert.match(yml, /AI_RADAR_TIMEOUT_MS/)
})

test('.gitattributes forces LF for shell and Node entrypoints', () => {
  const ga = readFileSync(join(root, '.gitattributes'), 'utf8')
  assert.match(ga, /\*\.sh\s+text\s+eol=lf/)
  assert.match(ga, /\*\.mjs\s+text\s+eol=lf/)
  assert.match(ga, /\*\.yml\s+text\s+eol=lf/)
  assert.match(ga, /\*\.md\s+text\s+eol=lf/)
  assert.match(ga, /\*\.java\s+text\s+eol=lf/)
  assert.match(ga, /\*\.xml\s+text\s+eol=lf/)
  assert.match(ga, /\*\.properties\s+text\s+eol=lf/)
  assert.match(ga, /\*\.json\s+text\s+eol=lf/)
  assert.match(ga, /\*\.ts\s+text\s+eol=lf/)
  assert.match(ga, /\*\.tsx\s+text\s+eol=lf/)
  assert.match(ga, /\*\.css\s+text\s+eol=lf/)
  assert.match(ga, /bin\/ai-radar\s+text\s+eol=lf/)
})

test('CODEOWNERS is present', () => {
  const text = readFileSync(join(root, '.github/CODEOWNERS'), 'utf8')
  assert.match(text, /@sunliangcode/)
})
