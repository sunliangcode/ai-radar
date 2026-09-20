export type Range = '24h' | '7d' | '30d' | 'all'

/** Default visible time chips — keep the rest behind「更多」. */
export const PRIMARY_RANGES: Range[] = ['24h', '7d']
export const MORE_RANGES: Range[] = ['30d', 'all']
export const RANGES: Range[] = [...PRIMARY_RANGES, ...MORE_RANGES]

export const PAGE = 40

/** Source types shown first in browse chips (CN programmer daily reading). */
export const DOMESTIC_CHANNEL_ORDER = [
  'ZHIHU',
  'V2EX',
  'BILIBILI',
  'WEIBO',
  'RSS',
  'GOOGLE_NEWS',
] as const

export function sortChannelTypes(types: string[]): string[] {
  const rank = new Map(DOMESTIC_CHANNEL_ORDER.map((t, i) => [t, i]))
  return [...types].sort((a, b) => {
    const ra = rank.get(a.toUpperCase() as (typeof DOMESTIC_CHANNEL_ORDER)[number]) ?? 100
    const rb = rank.get(b.toUpperCase() as (typeof DOMESTIC_CHANNEL_ORDER)[number]) ?? 100
    if (ra !== rb) return ra - rb
    return a.localeCompare(b)
  })
}

export function sinceIso(range: Range): string | undefined {
  if (range === 'all') return undefined
  const now = Date.now()
  const ms = range === '24h' ? 86400_000 : range === '7d' ? 7 * 86400_000 : 30 * 86400_000
  return new Date(now - ms).toISOString()
}
