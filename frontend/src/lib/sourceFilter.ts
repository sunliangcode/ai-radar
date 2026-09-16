import type { Item, Source } from './api'
import { isSourceDisplayed } from './displaySources'

export function parsePrimarySourceId(raw?: string | null): number | null {
  if (!raw) return null
  const m = raw.match(/\d+/)
  if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}

export function itemSourceIds(item: Pick<Item, 'primarySourceId' | 'sourceRefs'>): number[] {
  const ids = new Set<number>()
  const primary = parsePrimarySourceId(item.primarySourceId)
  if (primary != null) ids.add(primary)
  for (const ref of item.sourceRefs ?? []) {
    const id = parsePrimarySourceId(ref)
    if (id != null) ids.add(id)
  }
  return [...ids]
}

export function itemMatchesDisplay(
  item: Pick<Item, 'primarySourceId' | 'sourceRefs'>,
  allowlist: number[] | null,
): boolean {
  if (allowlist === null) return true
  if (allowlist.length === 0) return false
  const ids = itemSourceIds(item)
  if (ids.length === 0) return false
  return ids.some((id) => isSourceDisplayed(id, allowlist))
}

export function changeMatchesDisplay(
  change: { sourceIds?: number[] },
  allowlist: number[] | null,
): boolean {
  if (allowlist === null) return true
  if (allowlist.length === 0) return false
  const ids = change.sourceIds ?? []
  if (ids.length === 0) return false
  return ids.some((id) => isSourceDisplayed(id, allowlist))
}

/** Decision / action / watching group — anything carrying sourceIds or event id. */
export function entityMatchesDisplay(
  entity: { sourceIds?: number[]; eventId?: number; changeId?: number },
  sourceMap: Map<number, number[]>,
  allowlist: number[] | null,
): boolean {
  if (allowlist === null) return true
  if (allowlist.length === 0) return false
  if (entity.sourceIds && entity.sourceIds.length > 0) {
    return changeMatchesDisplay(entity, allowlist)
  }
  const eid = entity.eventId ?? entity.changeId
  return impactEventMatchesDisplay(eid, sourceMap, allowlist)
}

export function impactEventMatchesDisplay(
  eventId: number | undefined,
  sourceMap: Map<number, number[]>,
  allowlist: number[] | null,
): boolean {
  if (allowlist === null) return true
  if (allowlist.length === 0) return false
  if (eventId == null) return false
  const ids = sourceMap.get(eventId) ?? []
  if (ids.length === 0) return false
  return ids.some((id) => isSourceDisplayed(id, allowlist))
}

export function enabledSources(sources: Source[] | undefined): Source[] {
  return (sources ?? []).filter((s) => s.enabled)
}
