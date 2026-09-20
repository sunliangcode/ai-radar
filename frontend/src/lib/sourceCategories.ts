import type { Source } from './api'

/** Settings-page grouping for sources (derived; not stored on the server). */
export type SourceCategoryId =
  | 'hot'
  | 'media'
  | 'community'
  | 'wechat'
  | 'global'
  | 'credentials'
  | 'other'

export const SOURCE_CATEGORY_ORDER: SourceCategoryId[] = [
  'hot',
  'media',
  'community',
  'wechat',
  'global',
  'credentials',
  'other',
]

const MEDIA_NAMES = new Set([
  '36氪',
  '少数派',
  'IT之家',
  'Solidot',
  '极客公园',
  '爱范儿',
  '虎嗅',
  'InfoQ 中国',
  '钛媒体',
  '雷峰网',
  '新浪科技',
  '人人都是产品经理',
  '开源中国',
  'HelloGitHub',
  '掘金',
  '数英',
  '数字尾巴',
])

const COMMUNITY_NAMES = new Set([
  '即刻 AI 探索站',
  '即刻 AI 讨论',
  '即刻工程师',
  'V2EX create/share',
  'SegmentFault',
])

const HOT_TYPES = new Set(['DAILY_HOT', 'WEIBO', 'ZHIHU', 'BILIBILI'])

const GLOBAL_TYPES = new Set([
  'HACKER_NEWS',
  'GITHUB',
  'GITHUB_TRENDING',
  'REDDIT',
  'TELEGRAM',
  'OSS_INSIGHT',
  'GDELT',
  'GOOGLE_NEWS',
])

const CREDENTIAL_TYPES = new Set(['PRODUCT_HUNT', 'TWITTER', 'EMAIL', 'WEB'])

function feedUrlOf(source: Source): string {
  const cfg = source.config
  if (!cfg || typeof cfg !== 'object') return ''
  const feed = (cfg as Record<string, unknown>).feedUrl ?? (cfg as Record<string, unknown>).url
  return typeof feed === 'string' ? feed : ''
}

export function sourceCategory(source: { name?: string; type?: string; config?: unknown }): SourceCategoryId {
  const type = (source.type ?? '').toUpperCase()
  const name = source.name ?? ''
  const feed = feedUrlOf(source as Source).toLowerCase()

  if (HOT_TYPES.has(type)) return 'hot'
  if (CREDENTIAL_TYPES.has(type)) return 'credentials'
  if (GLOBAL_TYPES.has(type)) return 'global'
  if (type === 'FIXTURE') return 'other'

  if (feed.includes('wechat2rss') || /wechat|公众号/i.test(name)) return 'wechat'
  if (COMMUNITY_NAMES.has(name) || type === 'V2EX' || /即刻|jike/i.test(name)) return 'community'
  if (
    /openai|huggingface|anthropic|deepmind|simon willison|vllm|github trending/i.test(name) ||
    /openai\.com|huggingface\.co|anthropic|deepmind\.google|simonwillison|vllm\.ai|github\.io\/GitHubTrending/i.test(
      feed,
    )
  ) {
    return 'global'
  }
  if (MEDIA_NAMES.has(name) || type === 'RSS') return 'media'

  return 'other'
}

export function groupSourcesByCategory<T extends { name?: string; type?: string; config?: unknown }>(
  sources: T[],
): Array<{ id: SourceCategoryId; sources: T[] }> {
  const buckets = new Map<SourceCategoryId, T[]>()
  for (const id of SOURCE_CATEGORY_ORDER) {
    buckets.set(id, [])
  }
  for (const source of sources) {
    const id = sourceCategory(source)
    buckets.get(id)!.push(source)
  }
  return SOURCE_CATEGORY_ORDER.map((id) => ({ id, sources: buckets.get(id)! })).filter(
    (g) => g.sources.length > 0,
  )
}

/** Connector type → category for create-form optgroups. */
export function connectorTypeCategory(typeId: string): SourceCategoryId {
  const type = typeId.toUpperCase()
  if (HOT_TYPES.has(type)) return 'hot'
  if (type === 'RSS') return 'media'
  if (type === 'V2EX') return 'community'
  if (GLOBAL_TYPES.has(type)) return 'global'
  if (CREDENTIAL_TYPES.has(type)) return 'credentials'
  return 'other'
}
