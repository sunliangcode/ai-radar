/** Match a catalog row the same way ConnectorRegistry does: trim, ignore case. */
export function findConnectorById<T extends { id: string }>(
  descriptors: readonly T[] | null | undefined,
  type: string | null | undefined,
): T | undefined {
  const wanted = (type ?? '').trim().toUpperCase()
  if (!wanted || !descriptors) return undefined
  return descriptors.find((d) => d.id.trim().toUpperCase() === wanted)
}

/** Match a delivery catalog row the same way DeliveryChannelIndex does: trim, ignore case. */
export function findDeliveryChannelById<T extends { id: string }>(
  channels: readonly T[] | null | undefined,
  channel: string | null | undefined,
): T | undefined {
  const wanted = (channel ?? '').trim().toLowerCase()
  if (!wanted || !channels) return undefined
  return channels.find((d) => d.id.trim().toLowerCase() === wanted)
}

type ConnectorFieldDescriptors =
  | readonly { id: string; configFields?: readonly { key: string; type?: string }[] }[]
  | null
  | undefined

/**
 * Default ConfigField type for a built-in connector config key.
 * Mirrors shared/spi-catalog `connectorFieldType` (`path` / `cliPath` → `path`).
 */
export function connectorFieldType(field: string): 'path' | 'text' {
  return field === 'cliPath' || field === 'path' ? 'path' : 'text'
}

/** Strict type to enforce in catalog health checks (path keys only). */
export function expectedConnectorFieldType(field: string): 'path' | undefined {
  return connectorFieldType(field) === 'path' ? 'path' : undefined
}

/** Built-in connector id → required config field (doctor/smoke/Settings); aligns with shared/spi-catalog.mjs. */
export const BUILTIN_CONNECTOR_FIELD_CHECKS = [
  { id: 'FIXTURE', field: 'path', issueKey: 'healthConnectorsMissingFixturePath' },
  { id: 'RSS', field: 'feedUrl', issueKey: 'healthConnectorsMissingRssFeedUrl' },
  { id: 'DAILY_HOT', field: 'route', issueKey: 'healthConnectorsMissingDailyHotRoute' },
  { id: 'WEB', field: 'url', issueKey: 'healthConnectorsMissingWebUrl' },
  { id: 'TELEGRAM', field: 'channels', issueKey: 'healthConnectorsMissingTelegramChannels' },
  { id: 'HACKER_NEWS', field: 'query', issueKey: 'healthConnectorsMissingHackerNewsQuery' },
  { id: 'GOOGLE_NEWS', field: 'query', issueKey: 'healthConnectorsMissingGoogleNewsQuery' },
  { id: 'GDELT', field: 'query', issueKey: 'healthConnectorsMissingGdeltQuery' },
  { id: 'REDDIT', field: 'subreddits', issueKey: 'healthConnectorsMissingRedditSubreddits' },
  { id: 'V2EX', field: 'nodes', issueKey: 'healthConnectorsMissingV2exNodes' },
  { id: 'GITHUB', field: 'query', issueKey: 'healthConnectorsMissingGithubQuery' },
  { id: 'TWITTER', field: 'users', issueKey: 'healthConnectorsMissingTwitterUsers' },
  { id: 'OSS_INSIGHT', field: 'keywords', issueKey: 'healthConnectorsMissingOssInsightKeywords' },
  { id: 'GITHUB_TRENDING', field: 'since', issueKey: 'healthConnectorsMissingGithubTrendingSince' },
  { id: 'PRODUCT_HUNT', field: 'maxItems', issueKey: 'healthConnectorsMissingProductHuntMaxItems' },
  { id: 'EMAIL', field: 'maxMessages', issueKey: 'healthConnectorsMissingEmailMaxMessages' },
  { id: 'ZHIHU', field: 'cliPath', issueKey: 'healthConnectorsMissingZhihuCliPath' },
  { id: 'WEIBO', field: 'cliPath', issueKey: 'healthConnectorsMissingWeiboCliPath' },
  { id: 'BILIBILI', field: 'cliPath', issueKey: 'healthConnectorsMissingBilibiliCliPath' },
] as const

/** Built-in delivery channel id → required settings key; aligns with shared/spi-catalog.mjs. */
export const BUILTIN_DELIVERY_SETTING_CHECKS = [
  {
    id: 'outbox',
    key: 'radar.delivery.outbox-enabled',
    issueKey: 'healthDeliveryMissingOutboxToggle',
  },
  { id: 'webhook', key: 'WEBHOOK_URL', issueKey: 'healthDeliveryMissingWebhookUrl' },
  { id: 'email', key: 'SMTP_HOST', issueKey: 'healthDeliveryMissingEmailSmtp' },
  { id: 'email', key: 'SMTP_TO', issueKey: 'healthDeliveryMissingEmailSmtp' },
  { id: 'feishu', key: 'FEISHU_WEBHOOK_URL', issueKey: 'healthDeliveryMissingFeishuWebhook' },
] as const

/** True when connector `typeId` exposes config field `fieldKey` (optional exact `fieldType`). */
export function connectorHasConfigField(
  descriptors: ConnectorFieldDescriptors,
  typeId: string,
  fieldKey: string,
  fieldType?: string,
): boolean {
  const row = findConnectorById(descriptors, typeId)
  if (!row) return false
  const fields = Array.isArray(row.configFields) ? row.configFields : []
  const want = fieldKey.trim().toLowerCase()
  return fields.some((f) => {
    if (f.key.trim().toLowerCase() !== want) return false
    if (fieldType != null && (f.type ?? '').trim() !== fieldType) return false
    return true
  })
}

type DeliveryFieldChannels =
  | readonly { id: string; settingsKeys?: readonly string[] }[]
  | null
  | undefined

/** True when delivery channel `channelId` exposes settings key `settingsKey`. */
export function deliveryHasSettingsKey(
  channels: DeliveryFieldChannels,
  channelId: string,
  settingsKey: string,
): boolean {
  const row = findDeliveryChannelById(channels, channelId)
  if (!row) return false
  const keys = Array.isArray(row.settingsKeys) ? row.settingsKeys : []
  const want = settingsKey.trim().toLowerCase()
  return keys.some((k) => k.trim().toLowerCase() === want)
}

/** SPI config field types allowed by ConnectorRegistry / Sources UI. */
export const CONNECTOR_CONFIG_FIELD_TYPES = ['text', 'path', 'secret', 'textarea'] as const

export type ConnectorConfigFieldType = (typeof CONNECTOR_CONFIG_FIELD_TYPES)[number]

export function isSecretConfigField(field: { type: string; key: string }): boolean {
  return field.type === 'secret' || field.key.toLowerCase().includes('cookie')
}

export function isMultilineConfigField(field: { type: string; key: string }): boolean {
  return (
    isSecretConfigField(field) ||
    field.type === 'textarea' ||
    field.key.toLowerCase().includes('prompt')
  )
}

export function isPathConfigField(field: { type: string }): boolean {
  return field.type === 'path'
}

type ConnectorCatalogRow = {
  id: string
  displayName?: string
  configFields?: readonly { key: string; type?: string }[]
}

/** Doctor/smoke connector field invariants (excludes catalog length). */
export function connectorCatalogInvariantsOk(
  descriptors: readonly ConnectorCatalogRow[] | null | undefined,
): boolean {
  return BUILTIN_CONNECTOR_FIELD_CHECKS.every((c) =>
    connectorHasConfigField(descriptors, c.id, c.field, expectedConnectorFieldType(c.field)),
  )
}

/**
 * Settings i18n key suffix under `settingsHub.*` when a built-in invariant fails,
 * or null when all required connectors/fields are present.
 */
export function connectorCatalogHealthIssueKey(
  descriptors: readonly ConnectorCatalogRow[] | null | undefined,
): string | null {
  if (!findConnectorById(descriptors, 'FIXTURE')) return 'healthConnectorsMissingFixture'
  for (const c of BUILTIN_CONNECTOR_FIELD_CHECKS) {
    const fieldType = expectedConnectorFieldType(c.field)
    if (
      !findConnectorById(descriptors, c.id) ||
      !connectorHasConfigField(descriptors, c.id, c.field, fieldType)
    ) {
      return c.issueKey
    }
  }
  return null
}

type DeliveryCatalogRow = {
  id: string
  displayName?: string
  enabled?: boolean
  settingsKeys?: readonly string[]
}

/** Doctor/smoke delivery settings-key invariants (excludes catalog length / enabled). */
export function deliveryCatalogInvariantsOk(
  channels: readonly DeliveryCatalogRow[] | null | undefined,
): boolean {
  return BUILTIN_DELIVERY_SETTING_CHECKS.every((c) =>
    deliveryHasSettingsKey(channels, c.id, c.key),
  )
}

/**
 * Settings i18n key suffix under `settingsHub.*` when a built-in delivery invariant fails,
 * or null when all required channels/keys are present.
 */
export function deliveryCatalogHealthIssueKey(
  channels: readonly DeliveryCatalogRow[] | null | undefined,
): string | null {
  if (!findDeliveryChannelById(channels, 'outbox')) return 'healthDeliveryMissingOutbox'
  for (const c of BUILTIN_DELIVERY_SETTING_CHECKS) {
    if (!findDeliveryChannelById(channels, c.id) || !deliveryHasSettingsKey(channels, c.id, c.key)) {
      return c.issueKey
    }
  }
  return null
}
