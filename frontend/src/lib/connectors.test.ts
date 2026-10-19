import { describe, expect, it } from 'vitest'
import {
  findConnectorById,
  findDeliveryChannelById,
  connectorHasConfigField,
  connectorCatalogInvariantsOk,
  connectorCatalogHealthIssueKey,
  deliveryCatalogInvariantsOk,
  deliveryCatalogHealthIssueKey,
  isMultilineConfigField,
  isPathConfigField,
  isSecretConfigField,
  deliveryHasSettingsKey,
  BUILTIN_DELIVERY_SETTING_CHECKS,
  BUILTIN_CONNECTOR_FIELD_CHECKS,
  connectorFieldType,
  expectedConnectorFieldType,
} from './connectors'

const catalog = [{ id: 'RSS' }, { id: 'FIXTURE' }]
const delivery = [{ id: 'email' }, { id: 'outbox' }]

describe('findConnectorById', () => {
  it('matches trimmed, case-insensitive type codes', () => {
    expect(findConnectorById(catalog, '  rss  ')?.id).toBe('RSS')
    expect(findConnectorById(catalog, 'fixture')?.id).toBe('FIXTURE')
  })

  it('returns undefined for blank or missing catalogs', () => {
    expect(findConnectorById(catalog, '   ')).toBeUndefined()
    expect(findConnectorById(catalog, null)).toBeUndefined()
    expect(findConnectorById(undefined, 'RSS')).toBeUndefined()
  })
})

describe('findDeliveryChannelById', () => {
  it('matches trimmed, case-insensitive channel ids', () => {
    expect(findDeliveryChannelById(delivery, '  Outbox  ')?.id).toBe('outbox')
    expect(findDeliveryChannelById(delivery, 'EMAIL')?.id).toBe('email')
  })

  it('returns undefined for blank or missing catalogs', () => {
    expect(findDeliveryChannelById(delivery, '   ')).toBeUndefined()
    expect(findDeliveryChannelById(delivery, null)).toBeUndefined()
    expect(findDeliveryChannelById(undefined, 'outbox')).toBeUndefined()
  })
})

describe('connectorHasConfigField / BUILTIN_CONNECTOR_FIELD_CHECKS', () => {
  it('covers every built-in connector field pair', () => {
    expect(BUILTIN_CONNECTOR_FIELD_CHECKS.length).toBeGreaterThanOrEqual(19)
    for (const c of BUILTIN_CONNECTOR_FIELD_CHECKS) {
      const fieldType = expectedConnectorFieldType(c.field)
      const okRow = [
        {
          id: c.id,
          configFields: [{ key: c.field, type: fieldType ?? 'text' }],
        },
      ]
      expect(connectorHasConfigField(okRow, c.id, c.field, fieldType)).toBe(true)
      expect(connectorHasConfigField([{ id: c.id, configFields: [] }], c.id, c.field, fieldType)).toBe(
        false,
      )
      expect(
        connectorHasConfigField(
          [{ id: 'OTHER', configFields: [{ key: c.field, type: fieldType ?? 'text' }] }],
          c.id,
          c.field,
          fieldType,
        ),
      ).toBe(false)
      if (fieldType === 'path') {
        expect(
          connectorHasConfigField(
            [{ id: c.id, configFields: [{ key: c.field, type: 'text' }] }],
            c.id,
            c.field,
            fieldType,
          ),
        ).toBe(false)
      }
    }
  })
})

const healthyCatalog = BUILTIN_CONNECTOR_FIELD_CHECKS.map((c) => ({
  id: c.id,
  configFields: [{ key: c.field, type: connectorFieldType(c.field) }],
}))

const healthyDelivery = (() => {
  const byId = new Map<string, string[]>()
  for (const c of BUILTIN_DELIVERY_SETTING_CHECKS) {
    const keys = byId.get(c.id) ?? []
    keys.push(c.key)
    byId.set(c.id, keys)
  }
  return [...byId.entries()].map(([id, settingsKeys]) => ({
    id,
    settingsKeys,
    enabled: true,
  }))
})()

describe('connectorCatalogInvariantsOk', () => {
  it('requires all built-in config field invariants', () => {
    expect(connectorCatalogInvariantsOk(healthyCatalog)).toBe(true)
    expect(
      connectorCatalogInvariantsOk(
        healthyCatalog.map((r) =>
          r.id === 'GDELT' ? { ...r, configFields: [] } : r,
        ),
      ),
    ).toBe(false)
  })
})

describe('connectorCatalogHealthIssueKey', () => {
  it('returns null when healthy, else first failing i18n key', () => {
    expect(connectorCatalogHealthIssueKey(healthyCatalog)).toBe(null)
    expect(connectorCatalogHealthIssueKey([])).toBe('healthConnectorsMissingFixture')
    expect(
      connectorCatalogHealthIssueKey(
        healthyCatalog.map((r) =>
          r.id === 'TELEGRAM' ? { ...r, configFields: [] } : r,
        ),
      ),
    ).toBe('healthConnectorsMissingTelegramChannels')
  })
})

describe('deliveryCatalogInvariantsOk', () => {
  it('requires all built-in settings-key invariants', () => {
    expect(deliveryCatalogInvariantsOk(healthyDelivery)).toBe(true)
    expect(
      deliveryCatalogInvariantsOk(
        healthyDelivery.map((r) =>
          r.id === 'webhook' ? { ...r, settingsKeys: [] } : r,
        ),
      ),
    ).toBe(false)
  })
})

describe('deliveryCatalogHealthIssueKey', () => {
  it('returns null when healthy, else first failing i18n key', () => {
    expect(deliveryCatalogHealthIssueKey(healthyDelivery)).toBe(null)
    expect(deliveryCatalogHealthIssueKey([])).toBe('healthDeliveryMissingOutbox')
    expect(
      deliveryCatalogHealthIssueKey(
        healthyDelivery.map((r) =>
          r.id === 'feishu' ? { ...r, settingsKeys: [] } : r,
        ),
      ),
    ).toBe('healthDeliveryMissingFeishuWebhook')
  })
})

describe('deliveryHasSettingsKey / BUILTIN_DELIVERY_SETTING_CHECKS', () => {
  it('covers every built-in delivery settings pair', () => {
    expect(BUILTIN_DELIVERY_SETTING_CHECKS.length).toBeGreaterThanOrEqual(5)
    for (const c of BUILTIN_DELIVERY_SETTING_CHECKS) {
      expect(deliveryHasSettingsKey(healthyDelivery, c.id, c.key)).toBe(true)
      expect(deliveryHasSettingsKey(healthyDelivery, c.id, 'missing-key')).toBe(false)
    }
  })
})

describe('BUILTIN_* issueKey uniqueness', () => {
  it('keeps connector field issueKeys unique', () => {
    const keys = BUILTIN_CONNECTOR_FIELD_CHECKS.map((c) => c.issueKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('keeps delivery settings issueKeys scoped (email may share SMTP key)', () => {
    const byId = new Map<string, string>()
    for (const c of BUILTIN_DELIVERY_SETTING_CHECKS) {
      const prev = byId.get(`${c.id}:${c.key}`)
      expect(prev).toBeUndefined()
      byId.set(`${c.id}:${c.key}`, c.issueKey)
    }
    expect(byId.size).toBe(BUILTIN_DELIVERY_SETTING_CHECKS.length)
  })
})

describe('config field helpers', () => {
  it('classifies secret, path, and multiline fields', () => {
    expect(isSecretConfigField({ type: 'secret', key: 'token' })).toBe(true)
    expect(isSecretConfigField({ type: 'text', key: 'cookie' })).toBe(true)
    expect(isPathConfigField({ type: 'path' })).toBe(true)
    expect(isMultilineConfigField({ type: 'textarea', key: 'notes' })).toBe(true)
    expect(isMultilineConfigField({ type: 'text', key: 'systemPrompt' })).toBe(true)
    expect(isMultilineConfigField({ type: 'text', key: 'feedUrl' })).toBe(false)
  })
})
