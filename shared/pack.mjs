/**
 * Local pack JSON helpers (CLI / check — no backend).
 * Keep SOURCE_TYPES in sync with backend SourceType enum
 * (enforced by source-types-sync.test.mjs).
 * Soft config-field warns follow {@link BUILTIN_CONNECTOR_PAIRS}.
 */

import { BUILTIN_CONNECTOR_PAIRS } from './spi-catalog.mjs'

/** Fields that accept a non-empty string or a non-empty string array. */
const STRING_OR_ARRAY_FIELDS = new Set(['channels', 'subreddits', 'nodes', 'users', 'keywords'])

/** Fields that accept a positive number or a non-empty numeric string. */
const POSITIVE_NUMBER_OR_STRING_FIELDS = new Set(['maxItems', 'maxMessages'])

/**
 * @param {unknown} entry
 * @returns {Record<string, unknown> | null}
 */
function configObject(entry) {
  if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) return null
  const cfg = /** @type {{ config?: unknown }} */ (entry).config
  if (cfg == null || typeof cfg !== 'object' || Array.isArray(cfg)) return null
  return /** @type {Record<string, unknown>} */ (cfg)
}

/**
 * @param {Record<string, unknown> | null} cfg
 * @param {string} field
 */
function missingConfigField(cfg, field) {
  if (!cfg) return true
  const v = cfg[field]
  if (STRING_OR_ARRAY_FIELDS.has(field)) {
    return !(
      (typeof v === 'string' && v.trim()) ||
      (Array.isArray(v) && v.some((x) => typeof x === 'string' && x.trim()))
    )
  }
  if (POSITIVE_NUMBER_OR_STRING_FIELDS.has(field)) {
    if (typeof v === 'number') return !Number.isFinite(v) || v <= 0
    if (typeof v === 'string') return !v.trim()
    return true
  }
  return typeof v !== 'string' || !v.trim()
}

/** @type {ReadonlySet<string>} */
export const SOURCE_TYPES = Object.freeze(
  new Set([
    'RSS',
    'HACKER_NEWS',
    'REDDIT',
    'GITHUB',
    'FIXTURE',
    'GOOGLE_NEWS',
    'GDELT',
    'OSS_INSIGHT',
    'GITHUB_TRENDING',
    'V2EX',
    'TELEGRAM',
    'PRODUCT_HUNT',
    'TWITTER',
    'WEB',
    'EMAIL',
    'ZHIHU',
    'JUEJIN',
    'WEIBO',
    'BILIBILI',
    'CSDN',
    'DAILY_HOT',
  ])
)

/** Enum values kept for old DB rows; no SourceConnector bean (boot disables). */
export const LEGACY_SOURCE_TYPES = Object.freeze(new Set(['JUEJIN', 'CSDN']))

/**
 * @typedef {{ ok: boolean, path: string, count: number, errors: string[], warnings: string[] }} PackValidateResult
 */

/**
 * Validate a pack sources file (JSON array of { type, name, … }).
 * @param {string} absPath
 * @param {{ readFileSync: (p: string, enc: string) => string, existsSync: (p: string) => boolean }} fs
 * @returns {PackValidateResult}
 */
export function validatePackFile(absPath, fs) {
  const errors = []
  const warnings = []
  if (!fs.existsSync(absPath)) {
    return {
      ok: false,
      path: absPath,
      count: 0,
      errors: [`Pack file not found: ${absPath}`],
      warnings,
    }
  }
  let raw
  try {
    raw = fs.readFileSync(absPath, 'utf8')
  } catch (e) {
    return {
      ok: false,
      path: absPath,
      count: 0,
      errors: [`Cannot read pack file: ${absPath}`, e.message || String(e)],
      warnings,
    }
  }
  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    return {
      ok: false,
      path: absPath,
      count: 0,
      errors: [`Pack file is not valid JSON: ${absPath}`, e.message || String(e)],
      warnings,
    }
  }
  if (!Array.isArray(data)) {
    return {
      ok: false,
      path: absPath,
      count: 0,
      errors: [`Pack file must be a JSON array of sources: ${absPath}`],
      warnings,
    }
  }
  if (data.length === 0) {
    errors.push('Pack array is empty (no sources)')
  }

  const seenNames = new Map()
  data.forEach((entry, i) => {
    const loc = `[${i}]`
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${loc}: entry must be a JSON object`)
      return
    }
    const rawName = typeof entry.name === 'string' ? entry.name : ''
    const name = rawName.trim()
    if (rawName && rawName !== name) {
      warnings.push(`${loc}: name has surrounding whitespace (trimmed for validation)`)
    }
    const rawType = typeof entry.type === 'string' ? entry.type : ''
    const typeRaw = rawType.trim()
    if (rawType && rawType !== typeRaw) {
      warnings.push(`${loc}: type has surrounding whitespace (trimmed for validation)`)
    }
    if (!name) errors.push(`${loc}: missing non-empty "name"`)
    if (!typeRaw) {
      errors.push(`${loc}: missing non-empty "type"`)
    } else {
      const type = typeRaw.toUpperCase()
      if (!SOURCE_TYPES.has(type)) {
        errors.push(`${loc}: unknown type "${typeRaw}" (see SourceType / docs/extending-connectors.md)`)
      } else {
        if (typeRaw !== type) {
          warnings.push(`${loc}: type "${typeRaw}" normalized to "${type}" (prefer uppercase SourceType)`)
        }
        if (LEGACY_SOURCE_TYPES.has(type)) {
          warnings.push(
            `${loc}: type "${type}" is legacy (no connector); boot disables homemade ${type} sources`
          )
        }
      }
    }
    if ('defaultEnabled' in entry && typeof entry.defaultEnabled !== 'boolean') {
      errors.push(`${loc}: "defaultEnabled" must be a boolean when present`)
    }
    if ('config' in entry && entry.config != null) {
      if (typeof entry.config !== 'object' || Array.isArray(entry.config)) {
        errors.push(`${loc}: "config" must be a JSON object when present`)
      }
    }
    const typeUpper =
      typeof entry.type === 'string' ? entry.type.trim().toUpperCase() : ''
    const cfg = configObject(entry)
    for (const [typeId, field] of BUILTIN_CONNECTOR_PAIRS) {
      if (typeUpper !== typeId) continue
      if (typeId === 'RSS') {
        const hasFeed =
          cfg &&
          ((typeof cfg.feedUrl === 'string' && cfg.feedUrl.trim()) ||
            (typeof cfg.url === 'string' && cfg.url.trim()))
        if (!hasFeed) {
          warnings.push(`${loc}: RSS sources usually set config.feedUrl (or legacy config.url)`)
        }
        continue
      }
      if (missingConfigField(cfg, field)) {
        if (typeId === 'FIXTURE') {
          warnings.push(`${loc}: FIXTURE sources usually set config.path to a JSON fixture file`)
        } else {
          const extra = typeId === 'DAILY_HOT' ? ' (e.g. weibo)' : ''
          warnings.push(`${loc}: ${typeId} sources usually set config.${field}${extra}`)
        }
      }
    }
    if (name) {
      const prev = seenNames.get(name)
      if (prev != null) warnings.push(`${loc}: duplicate name "${name}" (also at [${prev}])`)
      else seenNames.set(name, i)
    }
  })

  return {
    ok: errors.length === 0,
    path: absPath,
    count: data.length,
    errors,
    warnings,
  }
}
