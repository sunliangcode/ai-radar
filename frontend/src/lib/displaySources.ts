export const DISPLAY_SOURCE_IDS_KEY = 'radar.displaySourceIds'
/** Set once we have applied a first-run display policy (or the user chose one). */
export const DISPLAY_SOURCE_INIT_KEY = 'radar.displaySourceInit'
export const SOURCE_REGION_MODE_KEY = 'radar.sourceRegionMode'

export type SourceRegionMode = 'domestic' | 'foreign' | 'all'

/** Source types treated as CN / domestic mode. */
export const DOMESTIC_SOURCE_TYPES = new Set([
  'ZHIHU',
  'WEIBO',
  'BILIBILI',
  'DAILY_HOT',
  'V2EX',
  'RSS',
  'GOOGLE_NEWS',
])

/** Source types treated as foreign / overseas mode. */
export const FOREIGN_SOURCE_TYPES = new Set([
  'HACKER_NEWS',
  'GITHUB',
  'GITHUB_TRENDING',
  'REDDIT',
  'PRODUCT_HUNT',
  'TWITTER',
  'TELEGRAM',
  'OSS_INSIGHT',
  'GDELT',
  'WEB',
  'EMAIL',
  'FIXTURE',
])

/**
 * `null` = show all enabled sources;
 * `[]` = show none;
 * non-empty = allowlist of source ids.
 */
export function loadDisplaySourceIds(storage: Storage = localStorage): number[] | null {
  try {
    const raw = storage.getItem(DISPLAY_SOURCE_IDS_KEY)
    if (raw == null) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  } catch {
    return null
  }
}

export function saveDisplaySourceIds(ids: number[] | null, storage: Storage = localStorage): void {
  if (ids === null) {
    storage.removeItem(DISPLAY_SOURCE_IDS_KEY)
    return
  }
  storage.setItem(DISPLAY_SOURCE_IDS_KEY, JSON.stringify(ids))
}

export function loadSourceRegionMode(storage: Storage = localStorage): SourceRegionMode {
  const raw = storage.getItem(SOURCE_REGION_MODE_KEY)
  if (raw === 'domestic' || raw === 'foreign' || raw === 'all') return raw
  return 'all'
}

export function saveSourceRegionMode(mode: SourceRegionMode, storage: Storage = localStorage): void {
  storage.setItem(SOURCE_REGION_MODE_KEY, mode)
}

export function isDisplaySourceInitialized(storage: Storage = localStorage): boolean {
  if (storage.getItem(DISPLAY_SOURCE_INIT_KEY) === '1') return true
  // Legacy sessions that already saved an allowlist should not be overwritten.
  return storage.getItem(DISPLAY_SOURCE_IDS_KEY) != null
}

export function markDisplaySourceInitialized(storage: Storage = localStorage): void {
  storage.setItem(DISPLAY_SOURCE_INIT_KEY, '1')
}

/** Prefer CN browse when UI language or browser locale is Chinese. */
export function prefersDomesticBrowse(locale?: string, language = typeof navigator !== 'undefined' ? navigator.language : ''): boolean {
  const candidates = [locale, language].filter(Boolean) as string[]
  return candidates.some((l) => l.toLowerCase().startsWith('zh'))
}

export function domesticSourceIds(
  sources: Array<{ id: number; type?: string; enabled?: boolean }>,
): number[] {
  return sources
    .filter((s) => s.enabled !== false && DOMESTIC_SOURCE_TYPES.has((s.type ?? '').toUpperCase()))
    .map((s) => s.id)
    .sort((a, b) => a - b)
}

export function foreignSourceIds(
  sources: Array<{ id: number; type?: string; enabled?: boolean }>,
): number[] {
  return sources
    .filter((s) => s.enabled !== false && FOREIGN_SOURCE_TYPES.has((s.type ?? '').toUpperCase()))
    .map((s) => s.id)
    .sort((a, b) => a - b)
}

/** Collapse to `null` when every enabled source is included. Keep `[]` as show-none. */
export function normalizeDisplaySourceIds(
  ids: number[] | null,
  enabledSourceIds: number[],
): number[] | null {
  if (!enabledSourceIds.length) return null
  if (ids === null) return null
  const enabled = new Set(enabledSourceIds)
  const valid = [...new Set(ids.filter((id) => enabled.has(id)))].sort((a, b) => a - b)
  if (valid.length === 0) return []
  if (valid.length === enabledSourceIds.length) return null
  return valid
}

export function isSourceDisplayed(sourceId: number, allowlist: number[] | null): boolean {
  if (allowlist === null) return true
  if (allowlist.length === 0) return false
  return allowlist.includes(sourceId)
}

export function displaySourceIdsQuery(allowlist: number[] | null): string {
  if (!allowlist?.length) return ''
  return `sourceIds=${allowlist.map(String).join(',')}`
}
