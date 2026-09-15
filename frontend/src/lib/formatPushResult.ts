import type { TFunction } from 'i18next'

export type PushChannelResult = {
  channel?: string
  success?: boolean
  skipped?: boolean
  reason?: string
  itemCount?: number
  error?: string
}

export type PushResultBody = {
  skipped?: boolean
  reason?: string
  date?: string
  itemCount?: number
  eventCount?: number
  results?: PushChannelResult[]
}

const CHANNEL_LABELS: Record<string, string> = {
  feishu: 'Feishu',
  webhook: 'Webhook',
  email: 'Email',
}

function channelLabel(channel?: string): string {
  if (!channel) return '?'
  return CHANNEL_LABELS[channel] ?? channel
}

/** One-line toast for POST /api/jobs/push — channel, counts, and failure reasons. */
export function formatPushResult(body: PushResultBody | undefined, t: TFunction): string {
  if (!body) return t('common.pushDone')

  if (body.skipped) {
    if (body.reason === 'no_channels') return t('push.noChannels')
    if (body.reason === 'no_items') return t('push.noItems')
    return t('push.skipped')
  }

  const results = body.results ?? []
  if (results.length === 0) return t('push.noChannels')

  const parts = results.map((r) => {
    const name = channelLabel(r.channel)
    if (r.skipped) return `${name} ${t('push.channelSkipped')}`
    if (r.success) return `${name} ${t('push.channelOk', { count: r.itemCount ?? 0 })}`
    const err = r.error && r.error.length > 80 ? `${r.error.slice(0, 80)}…` : r.error
    return `${name} ${t('push.channelFail')}${err ? `：${err}` : ''}`
  })

  const ok = results.filter((r) => r.success && !r.skipped).length
  const failed = results.filter((r) => !r.success && !r.skipped).length
  const head =
    failed === 0
      ? t('push.allOk', { ok, count: body.itemCount ?? 0 })
      : t('push.partial', { ok, failed, count: body.itemCount ?? 0 })

  return `${head} · ${parts.join(' · ')}`
}
