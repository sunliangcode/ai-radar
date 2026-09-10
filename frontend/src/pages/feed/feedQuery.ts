export type Range = '24h' | '7d' | '30d' | 'all'

export const RANGES: Range[] = ['24h', '7d', '30d', 'all']

export const PAGE = 40

export function sinceIso(range: Range): string | undefined {
  if (range === 'all') return undefined
  const now = Date.now()
  const ms = range === '24h' ? 86400_000 : range === '7d' ? 7 * 86400_000 : 30 * 86400_000
  return new Date(now - ms).toISOString()
}
