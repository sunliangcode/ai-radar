/**
 * Soft doctor checks for SPI catalogs (GET /api/connectors, /api/delivery/channels).
 * Keep field-type allowlist aligned with ConnectorRegistry.CONFIG_FIELD_TYPES.
 */

export const CONNECTOR_CONFIG_FIELD_TYPES = Object.freeze(
  new Set(['text', 'path', 'secret', 'textarea']),
)

/** Built-in connector id → required config field key (case-insensitive match). */
export const BUILTIN_CONNECTOR_FIELDS = Object.freeze([
  ['RSS', 'feedUrl'],
  ['DAILY_HOT', 'route'],
  ['WEB', 'url'],
  ['TELEGRAM', 'channels'],
  ['HACKER_NEWS', 'query'],
  ['GOOGLE_NEWS', 'query'],
  ['GDELT', 'query'],
  ['REDDIT', 'subreddits'],
  ['V2EX', 'nodes'],
  ['GITHUB', 'query'],
  ['TWITTER', 'users'],
  ['OSS_INSIGHT', 'keywords'],
  ['GITHUB_TRENDING', 'since'],
  ['PRODUCT_HUNT', 'maxItems'],
  ['EMAIL', 'maxMessages'],
  ['ZHIHU', 'cliPath'],
  ['WEIBO', 'cliPath'],
  ['BILIBILI', 'cliPath'],
])

/** FIXTURE/path + {@link BUILTIN_CONNECTOR_FIELDS} — single list for CI/docs/fixtures. */
export const BUILTIN_CONNECTOR_PAIRS = Object.freeze([
  ['FIXTURE', 'path'],
  ...BUILTIN_CONNECTOR_FIELDS,
])

/**
 * Built-in delivery channel id → required settings key.
 * Match is case-insensitive on channel id; keys compare case-insensitively except
 * `radar.delivery.outbox-enabled` which is matched lowercased.
 */
export const BUILTIN_DELIVERY_SETTINGS = Object.freeze([
  ['outbox', 'radar.delivery.outbox-enabled'],
  ['webhook', 'WEBHOOK_URL'],
  ['email', 'SMTP_HOST'],
  ['email', 'SMTP_TO'],
  ['feishu', 'FEISHU_WEBHOOK_URL'],
])

/** Display names for {@link healthyDeliveryCatalog} fixtures. */
const BUILTIN_DELIVERY_DISPLAY = Object.freeze({
  outbox: 'Outbox',
  webhook: 'Webhook',
  email: 'Email',
  feishu: 'Feishu',
})
/** Display names for {@link healthyConnectorCatalog} fixtures. */
const BUILTIN_CONNECTOR_DISPLAY = Object.freeze({
  FIXTURE: 'Fixture',
  RSS: 'RSS',
  DAILY_HOT: 'DailyHot',
  WEB: 'Web',
  TELEGRAM: 'Telegram',
  HACKER_NEWS: 'Hacker News',
  GOOGLE_NEWS: 'Google News',
  GDELT: 'GDELT',
  REDDIT: 'Reddit',
  V2EX: 'V2EX',
  GITHUB: 'GitHub',
  TWITTER: 'Twitter',
  OSS_INSIGHT: 'OSS Insight',
  GITHUB_TRENDING: 'GitHub Trending',
  PRODUCT_HUNT: 'Product Hunt',
  EMAIL: 'Email',
  ZHIHU: 'Zhihu',
  WEIBO: 'Weibo',
  BILIBILI: 'Bilibili',
})

/**
 * Default ConfigField type for a built-in connector config key.
 * `cliPath` → `path`; everything else → `text` (FIXTURE `path` is also `path`).
 *
 * @param {string} field
 * @returns {'path' | 'text'}
 */
export function connectorFieldType(field) {
  return field === 'cliPath' || field === 'path' ? 'path' : 'text'
}

/** Slash-joined `id/field` list for CLI/MCP help (from {@link BUILTIN_CONNECTOR_PAIRS}). */
export function formatBuiltinConnectorExpect(sep = ', ') {
  return BUILTIN_CONNECTOR_PAIRS.map(([id, field]) => `${id}/${field}`).join(sep)
}

/** Slash-joined `id/key` list for CLI/MCP help (from {@link BUILTIN_DELIVERY_SETTINGS}). */
export function formatBuiltinDeliveryExpect(sep = ', ') {
  return BUILTIN_DELIVERY_SETTINGS.map(([id, key]) => `${id}/${key}`).join(sep)
}

/** Markdown tick-joined `` `id`/`field` `` list for docs (from {@link BUILTIN_CONNECTOR_PAIRS}). */
export function formatBuiltinConnectorTicks(sep = ', ') {
  return BUILTIN_CONNECTOR_PAIRS.map(([id, field]) => `\`${id}\`/\`${field}\``).join(sep)
}

/** Markdown tick-joined `` `id`/`key` `` list for docs (from {@link BUILTIN_DELIVERY_SETTINGS}). */
export function formatBuiltinDeliveryTicks(sep = ', ') {
  return BUILTIN_DELIVERY_SETTINGS.map(([id, key]) => `\`${id}\`/\`${key}\``).join(sep)
}

/**
 * Sorted healthy connector catalog for tests ({@link BUILTIN_CONNECTOR_PAIRS}).
 * Pass `overrides[id] = []` (or custom fields) to strip/replace a row's configFields.
 *
 * @param {Record<string, readonly { key: string, type?: string }[]>} [overrides]
 * @returns {{ id: string, displayName: string, configFields: { key: string, type?: string }[] }[]}
 */
export function healthyConnectorCatalog(overrides = {}) {
  /** @type {{ id: string, displayName: string, configFields: { key: string, type?: string }[] }[]} */
  const rows = []
  for (const [id, field] of BUILTIN_CONNECTOR_PAIRS) {
    rows.push({
      id,
      displayName: BUILTIN_CONNECTOR_DISPLAY[id] ?? id,
      configFields: [{ key: field, type: connectorFieldType(field) }],
    })
  }
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(overrides, row.id)) {
      row.configFields = [...(overrides[row.id] ?? [])]
    }
  }
  rows.sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: 'base' }))
  return rows
}

/**
 * Sorted healthy delivery catalog for tests ({@link BUILTIN_DELIVERY_SETTINGS}).
 * Pass `overrides[id] = []` (or custom keys) to strip/replace a row's settingsKeys.
 *
 * @param {Record<string, readonly string[]>} [overrides]
 * @returns {{ id: string, displayName: string, settingsKeys: string[] }[]}
 */
export function healthyDeliveryCatalog(overrides = {}) {
  /** @type {Map<string, string[]>} */
  const byId = new Map()
  for (const [id, key] of BUILTIN_DELIVERY_SETTINGS) {
    const keys = byId.get(id) ?? []
    keys.push(key)
    byId.set(id, keys)
  }
  /** @type {{ id: string, displayName: string, settingsKeys: string[] }[]} */
  const rows = []
  for (const [id, settingsKeys] of byId) {
    rows.push({
      id,
      displayName: BUILTIN_DELIVERY_DISPLAY[id] ?? id,
      settingsKeys: [...settingsKeys],
    })
  }
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(overrides, row.id)) {
      row.settingsKeys = [...(overrides[row.id] ?? [])]
    }
  }
  rows.sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: 'base' }))
  return rows
}

/**
 * @param {string[]} issues
 * @param {string[]} ids
 * @param {unknown[]} rows
 * @param {string} typeId
 * @param {string} fieldKey
 */
function requireConnectorConfigField(issues, ids, rows, typeId, fieldKey) {
  const want = typeId.toUpperCase()
  if (!ids.some((i) => i.toUpperCase() === want)) {
    issues.push(`${typeId} missing from connectors`)
    return
  }
  const row = rows.find(
    (r) => r != null && typeof r.id === 'string' && r.id.trim().toUpperCase() === want,
  )
  const fields = Array.isArray(row?.configFields) ? row.configFields : []
  const fold = fieldKey.toLowerCase()
  const has = fields.some(
    (f) => f != null && typeof f.key === 'string' && f.key.trim().toLowerCase() === fold,
  )
  if (!has) issues.push(`${typeId} missing config field ${fieldKey}`)
}

/**
 * @param {string[]} issues
 * @param {unknown} row
 * @param {string} channelId
 * @param {string} settingsKey
 */
function requireDeliverySettingsKeyOnRow(issues, row, channelId, settingsKey) {
  const keys = Array.isArray(row?.settingsKeys) ? row.settingsKeys : []
  const fold = settingsKey.toLowerCase()
  const has = keys.some((k) => typeof k === 'string' && k.trim().toLowerCase() === fold)
  if (!has) issues.push(`${channelId} missing settings key ${settingsKey}`)
}
/**
 * @param {unknown} rows
 * @returns {null | { id: string, ok: boolean, level: 'ok'|'warn', detail: string, data?: object, next?: string }}
 */
export function connectorCatalogCheck(rows) {
  if (!Array.isArray(rows)) return null
  const issues = []
  if (rows.length < 19) issues.push(`expected ≥19 connectors, got ${rows.length}`)
  const ids = []
  for (const row of rows) {
    const id = row == null || typeof row.id !== 'string' ? '' : row.id
    if (!id) {
      issues.push('blank connector id')
      continue
    }
    if (id !== id.trim()) issues.push(`connector id has surrounding whitespace (${JSON.stringify(id)})`)
    ids.push(id)
    const rawName = typeof row.displayName === 'string' ? row.displayName : ''
    if (rawName && rawName !== rawName.trim()) {
      issues.push(`displayName has surrounding whitespace for ${id.trim()}`)
    }
    const name = rawName.trim()
    if (!name) issues.push(`blank displayName for ${id.trim() || id}`)
    const fields = Array.isArray(row.configFields) ? row.configFields : []
    const keys = []
    for (const f of fields) {
      const rawKey = f == null || typeof f.key !== 'string' ? '' : f.key
      if (rawKey && rawKey !== rawKey.trim()) {
        issues.push(`config field key has surrounding whitespace on ${id.trim()}`)
      }
      const key = rawKey.trim()
      if (!key) {
        issues.push(`blank config field key on ${id.trim() || id}`)
        continue
      }
      const rawType = f == null || typeof f.type !== 'string' ? '' : f.type
      if (rawType && rawType !== rawType.trim()) {
        issues.push(`config field type has surrounding whitespace on ${id.trim()}.${key}`)
      }
      const type = rawType.trim()
      if (!type) issues.push(`blank config field type on ${id.trim()}.${key}`)
      else if (!CONNECTOR_CONFIG_FIELD_TYPES.has(type)) {
        issues.push(`unknown config field type ${type} on ${id.trim()}.${key}`)
      }
      const fold = key.toLowerCase()
      if (keys.includes(fold)) issues.push(`duplicate config field key ${fold} on ${id.trim()}`)
      else keys.push(fold)
    }
  }
  const sorted = [...ids].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  if (ids.join('\0') !== sorted.join('\0')) issues.push('connectors not sorted by id')
  if (new Set(ids.map((i) => i.toUpperCase())).size !== ids.length) {
    issues.push('duplicate connector id')
  }
  if (!ids.some((i) => i.toUpperCase() === 'FIXTURE')) {
    issues.push('FIXTURE missing from connectors')
  } else {
    const fixture = rows.find(
      (r) => r != null && typeof r.id === 'string' && r.id.trim().toUpperCase() === 'FIXTURE',
    )
    const fields = Array.isArray(fixture?.configFields) ? fixture.configFields : []
    const pathField = fields.find(
      (f) => f != null && typeof f.key === 'string' && f.key.trim().toLowerCase() === 'path',
    )
    if (!pathField) {
      issues.push('FIXTURE missing config field path')
    } else {
      const pathType =
        pathField != null && typeof pathField.type === 'string' ? pathField.type.trim() : ''
      if (pathType !== 'path') {
        issues.push(`FIXTURE path field type must be path (got ${pathType || 'blank'})`)
      }
    }
  }
  for (const [typeId, fieldKey] of BUILTIN_CONNECTOR_FIELDS) {
    requireConnectorConfigField(issues, ids, rows, typeId, fieldKey)
  }

  if (issues.length === 0) {
    return {
      id: 'connectors',
      ok: true,
      level: 'ok',
      detail: `${rows.length} connectors (sorted, unique, built-in config fields)`,
      data: { count: rows.length },
    }
  }
  return {
    id: 'connectors',
    ok: true,
    level: 'warn',
    detail: issues.join('; '),
    data: { count: rows.length, issues },
    next: './bin/ai-radar connectors · docs/extending-connectors.md',
  }
}

/**
 * @param {unknown} rows
 * @returns {null | { id: string, ok: boolean, level: 'ok'|'warn', detail: string, data?: object, next?: string }}
 */
export function deliveryCatalogCheck(rows) {
  if (!Array.isArray(rows)) return null
  const issues = []
  if (rows.length < 4) issues.push(`expected ≥4 delivery channels, got ${rows.length}`)
  const ids = []
  for (const row of rows) {
    const id = row == null || typeof row.id !== 'string' ? '' : row.id
    if (!id) {
      issues.push('blank delivery id')
      continue
    }
    if (id !== id.trim()) issues.push(`delivery id has surrounding whitespace (${JSON.stringify(id)})`)
    ids.push(id)
    const rawName = typeof row.displayName === 'string' ? row.displayName : ''
    if (rawName && rawName !== rawName.trim()) {
      issues.push(`displayName has surrounding whitespace for ${id.trim()}`)
    }
    const name = rawName.trim()
    if (!name) issues.push(`blank displayName for ${id.trim() || id}`)
    const keys = []
    for (const raw of Array.isArray(row.settingsKeys) ? row.settingsKeys : []) {
      const rawKey = typeof raw === 'string' ? raw : ''
      if (rawKey && rawKey !== rawKey.trim()) {
        issues.push(`settings key has surrounding whitespace on ${id.trim()}`)
      }
      const key = rawKey.trim()
      if (!key) {
        issues.push(`blank settings key on ${id.trim() || id}`)
        continue
      }
      const fold = key.toLowerCase()
      if (keys.includes(fold)) issues.push(`duplicate settings key ${fold} on ${id.trim()}`)
      else keys.push(fold)
    }
  }
  const sorted = [...ids].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  if (ids.join('\0') !== sorted.join('\0')) issues.push('delivery channels not sorted by id')
  if (new Set(ids.map((i) => i.toLowerCase())).size !== ids.length) {
    issues.push('duplicate delivery id')
  }
  /** Track missing channel once even when multiple settings keys are required. */
  const missingChannels = new Set()
  for (const [channelId, settingsKey] of BUILTIN_DELIVERY_SETTINGS) {
    const want = channelId.toLowerCase()
    const row = rows.find(
      (r) => r != null && typeof r.id === 'string' && r.id.trim().toLowerCase() === want,
    )
    if (!row) {
      if (!missingChannels.has(want)) {
        missingChannels.add(want)
        issues.push(`${channelId} missing from delivery channels`)
      }
      continue
    }
    requireDeliverySettingsKeyOnRow(issues, row, channelId, settingsKey)
  }
  if (issues.length === 0) {
    return {
      id: 'deliveryChannels',
      ok: true,
      level: 'ok',
      detail: `${rows.length} delivery channels (sorted, unique, built-in settings keys)`,
      data: { count: rows.length },
    }
  }
  return {
    id: 'deliveryChannels',
    ok: true,
    level: 'warn',
    detail: issues.join('; '),
    data: { count: rows.length, issues },
    next: './bin/ai-radar delivery-channels · docs/extending-delivery.md',
  }
}
