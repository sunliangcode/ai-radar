/** Map connector type → cover hue class (paired with tier in CSS). */
export function coverSourceClass(sourceType?: string): string {
  const key = (sourceType ?? '').toUpperCase().replace(/-/g, '_')
  if (key.includes('ZHIHU')) return 'cover-zhihu'
  if (key.includes('JUEJIN')) return 'cover-juejin'
  if (key.includes('CSDN')) return 'cover-csdn'
  if (key.includes('WEIBO')) return 'cover-weibo'
  if (key.includes('BILIBILI') || key.includes('BILI')) return 'cover-bilibili'
  if (key.includes('GITHUB') || key.includes('OSS')) return 'cover-github'
  if (key.includes('HACKER') || key === 'HN') return 'cover-hn'
  if (key.includes('REDDIT')) return 'cover-reddit'
  if (key.includes('TELEGRAM')) return 'cover-telegram'
  if (key.includes('TWITTER') || key.includes('X_')) return 'cover-twitter'
  if (key.includes('V2EX')) return 'cover-v2ex'
  if (key.includes('PRODUCT')) return 'cover-ph'
  if (key.includes('RSS') || key.includes('WEB') || key.includes('NEWS')) return 'cover-rss'
  if (key.includes('EMAIL') || key.includes('GDELT')) return 'cover-signal'
  return 'cover-default'
}

/** Compact ASCII fallback when i18n has no `sourceType.*` key. */
export function coverShortLabel(sourceType?: string, fallback = 'AI'): string {
  const raw = (sourceType ?? '').trim()
  if (!raw) return fallback
  const key = raw.toUpperCase().replace(/-/g, '_')
  const known: Record<string, string> = {
    ZHIHU: 'Zhihu',
    JUEJIN: '掘金',
    CSDN: 'CSDN',
    WEIBO: '微博',
    BILIBILI: 'B站',
    GITHUB: 'GH',
    HACKER_NEWS: 'HN',
    REDDIT: 'RD',
    RSS: 'RSS',
    WEB: 'WEB',
    TELEGRAM: 'TG',
    TWITTER: 'X',
    V2EX: 'V2',
    PRODUCT_HUNT: 'PH',
    GOOGLE_NEWS: 'GN',
    GDELT: 'GD',
    EMAIL: 'Mail',
    OSS_INSIGHT: 'OSS',
    GITHUB_TRENDING: 'GHT',
  }
  if (known[key]) return known[key]
  const compact = raw.replace(/[_-]/g, ' ')
  const words = compact.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return words.map((w) => w[0]!.toUpperCase()).join('').slice(0, 4)
  return raw.slice(0, 4).toUpperCase()
}

export function isZhihuSource(sourceType?: string | null): boolean {
  return (sourceType ?? '').toUpperCase().includes('ZHIHU')
}
