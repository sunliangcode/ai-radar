/**
 * Keep one-box / status soft paths pointing at the live LLM probe.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BUILTIN_CONNECTOR_PAIRS,
  BUILTIN_DELIVERY_SETTINGS,
  formatBuiltinConnectorExpect,
  formatBuiltinConnectorTicks,
  formatBuiltinDeliveryExpect,
  formatBuiltinDeliveryTicks,
} from './spi-catalog.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('install.sh and status.sh mention health-llm', () => {
  for (const rel of ['install.sh', 'scripts/status.sh']) {
    const text = readFileSync(join(root, rel), 'utf8')
    assert.match(text, /health-llm/, `${rel} should mention health-llm`)
  }
})

test('install.sh and status.sh handle modelPresent', () => {
  for (const rel of ['install.sh', 'scripts/status.sh']) {
    const text = readFileSync(join(root, rel), 'utf8')
    assert.match(text, /modelPresent/, `${rel} should check modelPresent`)
  }
})

test('backup.sh and CLI help mention AI_RADAR_DB', () => {
  const backup = readFileSync(join(root, 'scripts/backup.sh'), 'utf8')
  assert.match(backup, /AI_RADAR_DB/, 'backup.sh should mention AI_RADAR_DB')
  assert.match(backup, /backend\/data\/radar\.db/, 'backup.sh should hint Maven DB path')
  assert.match(backup, /using Maven DB path/, 'backup.sh should auto-fallback to Maven path')
  assert.match(backup, /BACKUP_KEEP/, 'backup.sh should honor BACKUP_KEEP')
  assert.match(backup, /invalid — using 14/, 'backup.sh should reject invalid BACKUP_KEEP')
  const cli = readFileSync(join(root, 'cli/ai-radar.mjs'), 'utf8')
  assert.match(cli, /AI_RADAR_DB/, 'cli help should mention AI_RADAR_DB')
  assert.match(cli, /BACKUP_KEEP/, 'cli help should mention BACKUP_KEEP')
})

test('status.sh mentions optional daily-hot port 6688', () => {
  const status = readFileSync(join(root, 'scripts/status.sh'), 'utf8')
  assert.match(status, /6688/, 'status.sh should mention daily-hot port 6688')
  assert.match(status, /daily-hot/, 'status.sh should label daily-hot')
})

test('status.sh soft-checks SPI catalogs when backend is up', () => {
  const status = readFileSync(join(root, 'scripts/status.sh'), 'utf8')
  assert.match(status, /\/api\/connectors/)
  assert.match(status, /\/api\/delivery\/channels/)
  assert.match(status, /check-spi-catalog\.mjs/)
  assert.match(status, /delivery-channels/)
})

test('bug report template asks for SPI catalog diagnostics', () => {
  const bug = readFileSync(join(root, '.github/ISSUE_TEMPLATE/bug_report.yml'), 'utf8')
  assert.match(bug, /SPI connectors\/deliveryChannels|SPI catalog/)
  assert.match(bug, /ai-radar connectors/)
  assert.match(bug, /delivery-channels/)
  assert.match(bug, /status\.sh/)
})

test('PR template SPI checklist names BUILTIN tables', () => {
  const pr = readFileSync(join(root, '.github/pull_request_template.md'), 'utf8')
  assert.match(pr, /BUILTIN_CONNECTOR_PAIRS/)
  assert.match(pr, /BUILTIN_DELIVERY_SETTINGS/)
  assert.match(pr, /smoke-extensibility\.sh/)
})

test('SUPPORT.md and CONTRIBUTING.md mention soft SPI catalogs', () => {
  const support = readFileSync(join(root, 'SUPPORT.md'), 'utf8')
  const contrib = readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8')
  assert.match(support, /deliveryChannels|SPI connectors/)
  assert.match(support, /delivery-channels/)
  assert.match(contrib, /BUILTIN_CONNECTOR_PAIRS/)
  assert.match(contrib, /BUILTIN_DELIVERY_SETTINGS/)
  assert.match(contrib, /soft SPI catalogs/)
})

test('docs/development.md lists spi-catalog + SpiCatalogBlurbs sync surfaces', () => {
  const dev = readFileSync(join(root, 'docs/development.md'), 'utf8')
  assert.match(dev, /BUILTIN_CONNECTOR_PAIRS/)
  assert.match(dev, /SpiCatalogBlurbs/)
  assert.match(dev, /formatBuiltin/)
})

test('AGENTS.md names SPI field tables and SpiCatalogBlurbs', () => {
  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8')
  assert.match(agents, /BUILTIN_CONNECTOR_PAIRS/)
  assert.match(agents, /BUILTIN_DELIVERY_SETTINGS/)
  assert.match(agents, /SpiCatalogBlurbs/)
})

test('docs/agents.md names BUILTIN SPI tables for doctor diagnostics', () => {
  const agents = readFileSync(join(root, 'docs/agents.md'), 'utf8')
  assert.match(agents, /BUILTIN_CONNECTOR_PAIRS/)
  assert.match(agents, /BUILTIN_DELIVERY_SETTINGS/)
})

test('docs/extensibility.md names spi-catalog tables and SpiCatalogBlurbs', () => {
  const ext = readFileSync(join(root, 'docs/extensibility.md'), 'utf8')
  assert.match(ext, /BUILTIN_CONNECTOR_PAIRS/)
  assert.match(ext, /BUILTIN_DELIVERY_SETTINGS/)
  assert.match(ext, /SpiCatalogBlurbs/)
  assert.match(ext, /spi-catalog\.mjs/)
})

test('Makefile help names SPI catalog targets and BUILTIN tables', () => {
  const mk = readFileSync(join(root, 'Makefile'), 'utf8')
  assert.match(mk, /make doctor.*SPI catalogs/)
  assert.match(mk, /BUILTIN_CONNECTOR_PAIRS/)
  assert.match(mk, /BUILTIN_CONNECTOR_FIELDS/)
  assert.match(mk, /BUILTIN_DELIVERY_SETTINGS/)
  assert.match(mk, /make connectors/)
  assert.match(mk, /make delivery-channels/)
})

test('scripts/README.md points status/smoke at check-spi-catalog.mjs', () => {
  const readme = readFileSync(join(root, 'scripts/README.md'), 'utf8')
  assert.match(readme, /check-spi-catalog\.mjs/)
  assert.match(readme, /status\.sh/)
  assert.match(readme, /smoke-extensibility\.sh/)
})

test('stop.sh footer mentions backup and BACKUP_KEEP', () => {
  const stop = readFileSync(join(root, 'stop.sh'), 'utf8')
  assert.match(stop, /backup/, 'stop.sh should mention backup')
  assert.match(stop, /BACKUP_KEEP/, 'stop.sh should mention BACKUP_KEEP')
})

test('docs/mcp.md and shared/errors.mjs both document request_timeout', () => {
  const mcp = readFileSync(join(root, 'docs/mcp.md'), 'utf8')
  const errors = readFileSync(join(root, 'shared/errors.mjs'), 'utf8')
  assert.match(mcp, /request_timeout/, 'docs/mcp.md should document request_timeout')
  assert.match(errors, /request_timeout/, 'shared/errors.mjs should emit request_timeout')
})

test('.env.example documents LOCAL_TOKEN scope', () => {
  const env = readFileSync(join(root, 'backend/.env.example'), 'utf8')
  assert.match(env, /LOCAL_TOKEN/, '.env.example should mention LOCAL_TOKEN')
  assert.match(env, /\/api\/health\/llm/, '.env.example should note health/llm bypass')
  assert.match(env, /mutating|\/api\/settings/, '.env.example should note mutation/settings scope')
})

test('smoke / status reuse shared/check-spi-catalog.mjs for SPI catalogs', () => {
  const smoke = readFileSync(join(root, 'scripts/smoke-extensibility.sh'), 'utf8')
  const status = readFileSync(join(root, 'scripts/status.sh'), 'utf8')
  assert.match(smoke, /shared\/check-spi-catalog\.mjs" connectors/)
  assert.match(smoke, /shared\/check-spi-catalog\.mjs" delivery/)
  assert.match(status, /shared\/check-spi-catalog\.mjs" connectors/)
  assert.match(status, /shared\/check-spi-catalog\.mjs" delivery/)
})

test('mcp/server.mjs documents AI_RADAR_TIMEOUT_MS', () => {
  const src = readFileSync(join(root, 'mcp/server.mjs'), 'utf8')
  assert.match(src, /AI_RADAR_TIMEOUT_MS/, 'mcp/server.mjs should document AI_RADAR_TIMEOUT_MS')
})

test('OpenAPI / MCP / ConnectorsController name every BUILTIN_CONNECTOR_FIELDS invariant', () => {
  const connectors = readFileSync(
    join(root, 'backend/src/main/java/com/airadar/api/ConnectorsController.java'),
    'utf8',
  )
  const delivery = readFileSync(
    join(root, 'backend/src/main/java/com/airadar/api/DeliveryChannelsController.java'),
    'utf8',
  )
  const blurbs = readFileSync(
    join(root, 'backend/src/main/java/com/airadar/config/SpiCatalogBlurbs.java'),
    'utf8',
  )
  const openapi = readFileSync(
    join(root, 'backend/src/main/java/com/airadar/config/OpenApiConfig.java'),
    'utf8',
  )
  const mcp = readFileSync(join(root, 'mcp/server.mjs'), 'utf8')
  const mcpDoc = readFileSync(join(root, 'docs/mcp.md'), 'utf8')
  const apiDoc = readFileSync(join(root, 'docs/api.md'), 'utf8')
  const cliDoc = readFileSync(join(root, 'docs/cli.md'), 'utf8')
  const devDoc = readFileSync(join(root, 'docs/development.md'), 'utf8')
  const skill = readFileSync(join(root, 'SKILL.md'), 'utf8')
  const install = readFileSync(join(root, 'docs/installation.md'), 'utf8')
  assert.match(mcp, /formatBuiltinConnectorExpect/)
  assert.match(mcp, /formatBuiltinDeliveryExpect/)
  assert.match(connectors, /SpiCatalogBlurbs\.CONNECTOR_OPERATION_SUMMARY/)
  assert.match(delivery, /SpiCatalogBlurbs\.DELIVERY_OPERATION_SUMMARY/)
  assert.match(openapi, /SpiCatalogBlurbs\.CONNECTOR_EXPECT/)
  assert.match(openapi, /SpiCatalogBlurbs\.DELIVERY_EXPECT/)
  const connTicks = formatBuiltinConnectorTicks()
  const delTicks = formatBuiltinDeliveryTicks()
  assert.ok(BUILTIN_CONNECTOR_PAIRS.length >= 19, `expected ≥19 gated connector pairs, got ${BUILTIN_CONNECTOR_PAIRS.length}`)
  for (const [id, field] of BUILTIN_CONNECTOR_PAIRS) {
    assert.ok(blurbs.includes(`${id}/${field}`), `SpiCatalogBlurbs missing ${id}/${field}`)
  }
  for (const [id, key] of BUILTIN_DELIVERY_SETTINGS) {
    assert.ok(blurbs.includes(`${id}/${key}`), `SpiCatalogBlurbs missing ${id}/${key}`)
  }
  assert.ok(BUILTIN_DELIVERY_SETTINGS.length >= 5, `expected ≥5 delivery settings pairs, got ${BUILTIN_DELIVERY_SETTINGS.length}`)
  for (const doc of [
    ['docs/mcp.md', mcpDoc],
    ['docs/api.md', apiDoc],
    ['docs/cli.md', cliDoc],
    ['docs/development.md', devDoc],
    ['SKILL.md', skill],
    ['docs/installation.md', install],
  ]) {
    assert.ok(doc[1].includes(connTicks), `${doc[0]} missing contiguous connector tick list`)
    assert.ok(doc[1].includes(delTicks), `${doc[0]} missing contiguous delivery tick list`)
  }
  // installation.md + api.md keep EN + ZH copies of the same contiguous lists
  const installConnHits = install.split(connTicks).length - 1
  const installDelHits = install.split(delTicks).length - 1
  assert.ok(installConnHits >= 2, `docs/installation.md expected ≥2 connector tick lists (EN+ZH), got ${installConnHits}`)
  assert.ok(installDelHits >= 2, `docs/installation.md expected ≥2 delivery tick lists (EN+ZH), got ${installDelHits}`)
  const apiConnHits = apiDoc.split(connTicks).length - 1
  const apiDelHits = apiDoc.split(delTicks).length - 1
  assert.ok(apiConnHits >= 2, `docs/api.md expected ≥2 connector tick lists (EN+ZH), got ${apiConnHits}`)
  assert.ok(apiDelHits >= 2, `docs/api.md expected ≥2 delivery tick lists (EN+ZH), got ${apiDelHits}`)
})

test('SpiCatalogBlurbs expect lists match formatBuiltin*Expect', () => {
  const java = readFileSync(
    join(root, 'backend/src/main/java/com/airadar/config/SpiCatalogBlurbs.java'),
    'utf8',
  )
  const concat = (constName) => {
    const block = java.match(new RegExp(`${constName}\\s*=\\s*([\\s\\S]*?);`))
    assert.ok(block, `SpiCatalogBlurbs.${constName} not found`)
    return [...block[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]).join('')
  }
  assert.equal(concat('CONNECTOR_EXPECT'), formatBuiltinConnectorExpect())
  assert.equal(concat('DELIVERY_EXPECT'), formatBuiltinDeliveryExpect())
})

test('cli help names every BUILTIN connector/delivery expect pair', () => {
  const help = execFileSync(process.execPath, [join(root, 'cli/ai-radar.mjs'), 'help'], {
    encoding: 'utf8',
  })
  assert.ok(help.includes(formatBuiltinConnectorExpect()), 'cli help missing connector expect list')
  assert.ok(help.includes(formatBuiltinDeliveryExpect()), 'cli help missing delivery expect list')
  for (const [id, field] of BUILTIN_CONNECTOR_PAIRS) {
    assert.ok(help.includes(`${id}/${field}`), `cli help missing ${id}/${field}`)
  }
  for (const [id, key] of BUILTIN_DELIVERY_SETTINGS) {
    assert.ok(help.includes(`${id}/${key}`), `cli help missing ${id}/${key}`)
  }
})

