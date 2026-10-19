#!/usr/bin/env node
/**
 * Thin ops CLI for AI Radar (HTTP wrapper).
 * Env:
 *   AI_RADAR_BASE_URL=http://127.0.0.1:8080
 *   LOCAL_TOKEN=... (optional; sent as X-Local-Token)
 *
 * Usage: ai-radar <command> [args]
 * See docs/cli.md
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { explainCliError } from '../shared/errors.mjs'
import {
  apiBaseUrl,
  DEFAULT_JOB_TIMEOUT_MS,
  DEFAULT_REQUEST_TIMEOUT_MS,
  requestTimeoutSignal,
} from '../shared/http.mjs'
import { validatePackFile } from '../shared/pack.mjs'
import { versionAlignCheck } from '../shared/version-align.mjs'
import { llmModeCheck } from '../shared/llm-mode.mjs'
import { modelPresentCheck } from '../shared/model-present.mjs'
import { translateStatusCheck } from '../shared/translate-status.mjs'
import {
  connectorCatalogCheck,
  deliveryCatalogCheck,
  formatBuiltinConnectorExpect,
  formatBuiltinDeliveryExpect,
} from '../shared/spi-catalog.mjs'

const BASE = apiBaseUrl(process.env.AI_RADAR_BASE_URL)
const TOKEN = (process.env.LOCAL_TOKEN || '').trim()

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const CLI_VERSION = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8')).version

async function api(path, init = {}) {
  const { timeoutMs, signal: initSignal, headers: initHeaders, ...fetchInit } = init
  const headers = { ...(initHeaders || {}) }
  if (TOKEN) headers['X-Local-Token'] = TOKEN
  if (fetchInit.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  const signal =
    initSignal !== undefined
      ? initSignal
      : requestTimeoutSignal(timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS)
  let res
  try {
    res = await fetch(`${BASE}${path}`, { ...fetchInit, headers, signal })
  } catch (err) {
    err.status = err.status || 0
    throw err
  }
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) {
    const err = new Error(`${res.status} ${typeof body === 'string' ? body : JSON.stringify(body)}`)
    err.status = res.status
    err.body = body
    throw err
  }
  return body
}

function printJson(data) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`)
}

function usage(exitCode = 0) {
  const text = `ai-radar — AI Radar ops CLI

Usage:
  ai-radar <command> [options]

Commands:
  health              GET /api/health (version, DB, translate, LLM)
  status              Alias of health
  health-llm          GET /api/health/llm (live LLM probe)
  home                GET /api/intelligence/home
  sources             GET /api/sources
  connectors          GET /api/connectors (SPI catalog; expect ${formatBuiltinConnectorExpect()})
  delivery-channels   GET /api/delivery/channels (SPI catalog; expect ${formatBuiltinDeliveryExpect()})
  fetch [--type T]    POST /api/jobs/fetch (optional sourceType)
  push                POST /api/jobs/push
  cluster             POST /api/jobs/cluster
  impact              POST /api/jobs/impact
  pack import <id> [--path FILE]
                      POST /api/packs/import (built-in id and/or JSON file)
  pack validate FILE  Local schema check (no backend)
  pack list           List packs/sources/*.json (no backend)
  doctor              Prereq + backend/translate/llm snapshot (JSON; soft modelPresent)
  check               Run scripts/check.sh (local CI-parity)
  backup              Run scripts/backup.sh
  help                Show this help
  version             Print CLI version

Environment:
  AI_RADAR_BASE_URL   Default http://127.0.0.1:8080
  LOCAL_TOKEN         Optional; sent as X-Local-Token
  AI_RADAR_TIMEOUT_MS Per-request HTTP timeout ms (reads default 8000; job POSTs default none; set to force all incl. jobs; 0/negative/non-numeric disables; empty→default)
  AI_RADAR_DB         Optional; SQLite path for backup (default data/radar.db)
  BACKUP_KEEP         Optional; how many backups to retain (default 14; invalid → 14)

Docs: docs/cli.md
`
  process.stdout.write(text)
  process.exit(exitCode)
}

function runScript(relPath) {
  const script = join(REPO_ROOT, relPath)
  const r = spawnSync('bash', [script], { stdio: 'inherit', cwd: REPO_ROOT })
  if (r.error) {
    console.error(r.error.message)
    process.exit(1)
  }
  process.exit(r.status ?? 1)
}

function parseFetchType(argv) {
  const i = argv.indexOf('--type')
  if (i >= 0 && argv[i + 1]) return argv[i + 1]
  const eq = argv.find((a) => a.startsWith('--type='))
  if (eq) return eq.slice('--type='.length)
  return null
}

/** @returns {{ sub: 'import'|'validate'|'list', packId?: string, path: string|null }} */
function parsePackArgs(argv) {
  const sub = argv[0]
  if (sub === 'list') {
    return { sub: 'list', path: null }
  }
  if (sub === 'validate') {
    if (!argv[1] || argv[1].startsWith('-')) {
      console.error('Usage: ai-radar pack validate <file.json>')
      process.exit(2)
    }
    return { sub: 'validate', path: resolve(process.cwd(), argv[1]) }
  }
  if (sub === 'import') {
    if (!argv[1] || argv[1].startsWith('-')) {
      console.error('Usage: ai-radar pack import <packId> [--path /abs/or/rel.json]')
      process.exit(2)
    }
    const packId = argv[1]
    let path = null
    const i = argv.indexOf('--path')
    if (i >= 0 && argv[i + 1]) path = argv[i + 1]
    const eq = argv.find((a) => a.startsWith('--path='))
    if (eq) path = eq.slice('--path='.length)
    if (path) path = resolve(process.cwd(), path)
    return { sub: 'import', packId, path }
  }
  console.error('Usage: ai-radar pack import <packId> [--path FILE]')
  console.error('       ai-radar pack validate <file.json>')
  console.error('       ai-radar pack list')
  process.exit(2)
}

function listBuiltInPacks() {
  const dir = join(REPO_ROOT, 'packs/sources')
  if (!existsSync(dir)) {
    printJson({ packs: [], dir, error: 'packs/sources not found' })
    process.exit(1)
  }
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
  const packs = files.map((f) => {
    const id = f.replace(/\.json$/, '')
    const abs = join(dir, f)
    const v = validatePackFile(abs, packFs)
    return {
      id,
      path: `packs/sources/${f}`,
      count: v.count,
      ok: v.ok,
      errors: v.errors,
      warnings: v.warnings,
    }
  })
  printJson({ packs, dir: 'packs/sources' })
  if (packs.some((p) => !p.ok)) process.exit(1)
}

const packFs = { readFileSync, existsSync }

/** Fail fast before hitting the API when --path is set. */
function preflightPackPath(absPath) {
  const r = validatePackFile(absPath, packFs)
  if (!r.ok) {
    for (const line of r.errors) console.error(line)
    console.error('Fix: see examples/packs/demo-local.json and docs/sources.md')
    process.exit(2)
  }
  for (const w of r.warnings) console.error(`Warning: ${w}`)
}

function printPackValidate(absPath) {
  const r = validatePackFile(absPath, packFs)
  printJson({
    ok: r.ok,
    path: r.path,
    count: r.count,
    errors: r.errors,
    warnings: r.warnings,
  })
  if (!r.ok) process.exit(2)
}

/** @returns {boolean} */
function nodeVersionOk() {
  const parts = String(process.versions.node || '0').split('.').map((x) => Number(x) || 0)
  const maj = parts[0] || 0
  const min = parts[1] || 0
  return maj > 20 || (maj === 20 && min >= 19)
}

function javaVersionHint() {
  const r = spawnSync('java', ['-version'], { encoding: 'utf8' })
  if (r.error && r.error.code === 'ENOENT') {
    return { ok: false, version: null, detail: 'java not on PATH' }
  }
  const text = `${r.stderr || ''}${r.stdout || ''}`
  const m = text.match(/version "([^"]+)"/) || text.match(/version (\S+)/)
  const version = m ? m[1] : null
  const ok = version != null && /^21(\.|$)/.test(version)
  return {
    ok,
    version,
    detail: ok ? 'Java 21 detected' : version ? `found ${version}; need Java 21` : 'could not parse java -version',
  }
}

async function runDoctor() {
  /** @type {{ id: string, ok: boolean, level: 'error'|'warn'|'ok', detail: string, data?: unknown }[]} */
  const checks = []
  const next = []

  const nodeOk = nodeVersionOk()
  checks.push({
    id: 'node',
    ok: nodeOk,
    level: nodeOk ? 'ok' : 'error',
    detail: nodeOk
      ? `Node ${process.versions.node}`
      : `Node ${process.versions.node} — need 20.19+ (oxlint / Vite 8)`,
  })
  if (!nodeOk) next.push('Install Node 20.19+ (nvm / official pkg)')

  const java = javaVersionHint()
  checks.push({
    id: 'java',
    ok: java.ok,
    level: java.ok ? 'ok' : 'warn',
    detail: java.detail,
    data: { version: java.version },
  })
  if (!java.ok) next.push('Install Java 21 for backend (./mvnw spring-boot:run)')

  const demoPath = join(REPO_ROOT, 'examples/packs/demo-local.json')
  if (existsSync(demoPath)) {
    const pack = validatePackFile(demoPath, packFs)
    checks.push({
      id: 'packDemo',
      ok: pack.ok,
      level: pack.ok ? 'ok' : 'error',
      detail: pack.ok
        ? `examples/packs/demo-local.json (${pack.count} sources)`
        : pack.errors.join('; '),
    })
    if (!pack.ok) next.push('Fix examples/packs/demo-local.json or re-clone')
  } else {
    checks.push({
      id: 'packDemo',
      ok: false,
      level: 'warn',
      detail: 'examples/packs/demo-local.json missing (not a full git checkout?)',
    })
  }

  const packsDir = join(REPO_ROOT, 'packs/sources')
  if (existsSync(packsDir)) {
    const files = readdirSync(packsDir).filter((f) => f.endsWith('.json')).sort()
    const results = files.map((f) => {
      const abs = join(packsDir, f)
      const v = validatePackFile(abs, packFs)
      return { id: f.replace(/\.json$/, ''), ok: v.ok, count: v.count, errors: v.errors }
    })
    const bad = results.filter((r) => !r.ok)
    checks.push({
      id: 'builtInPacks',
      ok: bad.length === 0,
      level: bad.length === 0 ? 'ok' : 'error',
      detail:
        bad.length === 0
          ? `${results.length} packs ok (${results.map((r) => r.id).join(', ')})`
          : bad.map((r) => `${r.id}: ${r.errors.join('; ')}`).join(' | '),
      data: { packs: results },
    })
    if (bad.length) next.push('Fix packs/sources/*.json then: ./bin/ai-radar pack list')
  } else {
    checks.push({
      id: 'builtInPacks',
      ok: false,
      level: 'warn',
      detail: 'packs/sources missing (not a full git checkout?)',
    })
  }

  let health = null
  try {
    health = await api('/api/health')
    checks.push({
      id: 'backend',
      ok: true,
      level: 'ok',
      detail: `reachable at ${BASE}`,
      data: {
        version: health?.version ?? null,
        translate: health?.translate?.status ?? null,
        llmMode: health?.llm?.mode ?? null,
      },
    })
    const align = versionAlignCheck(CLI_VERSION, health?.version)
    if (align) {
      checks.push(align)
      if (!align.ok) {
        next.push('git pull && rebuild (frontend build:embed or ./install.sh) so CLI and API SemVer match')
      }
    }
    const trCheck = translateStatusCheck(health?.translate)
    if (trCheck) {
      const { next: trNext, ...row } = trCheck
      checks.push(row)
      if (trNext) next.push(trNext)
    }
    const llmCheck = llmModeCheck(health?.llm)
    if (llmCheck) {
      const { next: llmNext, ...row } = llmCheck
      checks.push(row)
      if (llmNext) next.push(llmNext)
    }
    try {
      const probe = await api('/api/health/llm')
      const present = modelPresentCheck(probe)
      if (present) {
        const { next: presentNext, ...row } = present
        checks.push(row)
        if (presentNext) next.push(presentNext)
      }
    } catch {
      // Soft: live probe optional; llmModeCheck already covers config readiness.
    }
    try {
      const connectors = await api('/api/connectors')
      const connCheck = connectorCatalogCheck(connectors)
      if (connCheck) {
        const { next: connNext, ...row } = connCheck
        checks.push(row)
        if (connNext) next.push(connNext)
      }
    } catch {
      // Soft: catalog optional if health worked but SPI route failed.
    }
    try {
      const channels = await api('/api/delivery/channels')
      const delCheck = deliveryCatalogCheck(channels)
      if (delCheck) {
        const { next: delNext, ...row } = delCheck
        checks.push(row)
        if (delNext) next.push(delNext)
      }
    } catch {
      // Soft: catalog optional if health worked but SPI route failed.
    }
  } catch {
    checks.push({
      id: 'backend',
      ok: false,
      level: 'error',
      detail: `not reachable at ${BASE}`,
    })
    next.push('./install.sh   (or: cd backend && ./mvnw spring-boot:run)')
    next.push('./scripts/status.sh   for PID/port snapshot')
  }

  if (next.length === 0) {
    next.push('./bin/ai-radar home')
    next.push('./bin/ai-radar fetch')
  }

  const hard = checks.some((c) => c.level === 'error' && !c.ok)
  const report = {
    ok: !hard,
    cliVersion: CLI_VERSION,
    base: BASE,
    checks,
    next: [...new Set(next)],
  }
  printJson(report)
  process.exit(hard ? 1 : 0)
}

async function main() {
  const argv = process.argv.slice(2)
  const cmd = argv[0]

  if (!cmd || cmd === 'help' || cmd === '-h' || cmd === '--help') {
    usage(0)
  }
  if (cmd === 'version' || cmd === '-V' || cmd === '--version') {
    process.stdout.write(`ai-radar-cli ${CLI_VERSION}\n`)
    process.exit(0)
  }

  try {
    switch (cmd) {
      case 'health':
      case 'status': {
        printJson(await api('/api/health'))
        break
      }
      case 'health-llm': {
        printJson(await api('/api/health/llm'))
        break
      }
      case 'home': {
        printJson(await api('/api/intelligence/home'))
        break
      }
      case 'sources': {
        printJson(await api('/api/sources'))
        break
      }
      case 'connectors': {
        printJson(await api('/api/connectors'))
        break
      }
      case 'delivery-channels': {
        printJson(await api('/api/delivery/channels'))
        break
      }
      case 'fetch': {
        const type = parseFetchType(argv.slice(1))
        const q = type ? `?sourceType=${encodeURIComponent(type)}` : ''
        printJson(
          await api(`/api/jobs/fetch${q}`, { method: 'POST', timeoutMs: DEFAULT_JOB_TIMEOUT_MS }),
        )
        break
      }
      case 'push': {
        printJson(await api('/api/jobs/push', { method: 'POST', timeoutMs: DEFAULT_JOB_TIMEOUT_MS }))
        break
      }
      case 'cluster': {
        printJson(
          await api('/api/jobs/cluster', { method: 'POST', timeoutMs: DEFAULT_JOB_TIMEOUT_MS }),
        )
        break
      }
      case 'impact': {
        printJson(
          await api('/api/jobs/impact', { method: 'POST', timeoutMs: DEFAULT_JOB_TIMEOUT_MS }),
        )
        break
      }
      case 'pack': {
        const parsed = parsePackArgs(argv.slice(1))
        if (parsed.sub === 'list') {
          listBuiltInPacks()
          break
        }
        if (parsed.sub === 'validate') {
          printPackValidate(parsed.path)
          break
        }
        const { packId, path } = parsed
        if (path) preflightPackPath(path)
        const body = { packId }
        if (path) body.path = path
        printJson(
          await api('/api/packs/import', {
            method: 'POST',
            body: JSON.stringify(body),
          })
        )
        break
      }
      case 'doctor':
        await runDoctor()
        break
      case 'check':
        runScript('scripts/check.sh')
        break
      case 'backup':
        runScript('scripts/backup.sh')
        break
      default:
        console.error(`Unknown command: ${cmd}`)
        usage(2)
    }
  } catch (e) {
    const { exit, lines } = explainCliError(e, { base: BASE })
    for (const line of lines) console.error(line)
    process.exit(exit)
  }
}

await main()
