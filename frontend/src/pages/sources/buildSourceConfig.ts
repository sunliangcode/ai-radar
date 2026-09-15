import type { ConnectorDescriptor } from '../../lib/api'

const LIST_FIELDS = new Set([
  'subreddits',
  'channels',
  'users',
  'nodes',
  'languages',
  'keywords',
])

export function buildSourceConfig(
  descriptor: ConnectorDescriptor | undefined,
  values: Record<string, string>,
): Record<string, unknown> {
  const config: Record<string, unknown> = {}
  if (!descriptor) return config
  for (const field of descriptor.configFields) {
    const raw = (values[field.key] ?? '').trim()
    if (!raw) continue
    if (LIST_FIELDS.has(field.key)) {
      config[field.key] = raw.split(/[,\s]+/).filter(Boolean)
    } else if (
      /^(max|limit|perPage|hitsPerPage|fetchLimit|maxItems|maxResults|maxRecords|maxMessages)$/i.test(
        field.key,
      )
    ) {
      const n = Number(raw)
      config[field.key] = Number.isFinite(n) ? n : raw
    } else {
      config[field.key] = raw
    }
  }
  return config
}
