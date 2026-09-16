export const DISPLAY_SOURCE_IDS_KEY = 'radar.displaySourceIds'

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
