import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { FeedPage } from './useFeedList'
import { itemMatchesDisplay } from '../../lib/sourceFilter'

/** Snapshot + optimistic zero for feed list + unread badges (shared by Feed + ⌘K). */
export function optimisticMarkAllRead(
  qc: QueryClient,
  markQuery: string,
  opts?: { unreadOnly?: boolean },
) {
  const unreadOnly = opts?.unreadOnly ?? false
  const prevFeed = qc.getQueriesData({ queryKey: ['feed'] })
  const prevUnread = qc.getQueriesData<Record<string, number>>({ queryKey: ['unread-counts'] })
  const params = new URLSearchParams(markQuery.startsWith('?') ? markQuery.slice(1) : markQuery)
  const scopedType = params.get('sourceType') ?? undefined
  const sourceIdsRaw = params.get('sourceIds')
  const scopedIds =
    sourceIdsRaw && sourceIdsRaw.trim()
      ? sourceIdsRaw
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n))
      : null

  const inScope = (item: FeedPage['items'][0]) => {
    if (scopedIds && scopedIds.length > 0) return itemMatchesDisplay(item, scopedIds)
    if (scopedType) return item.primarySourceType === scopedType
    return true
  }

  qc.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ['feed'] }, (old) => {
    if (!old?.pages) return old
    return {
      ...old,
      pages: old.pages.map((page) => {
        let unreadLeft = 0
        const mapped = page.items.map((i) => {
          if (i.read || !inScope(i)) {
            if (!i.read) unreadLeft += 1
            return i
          }
          return { ...i, read: true }
        })
        const items = unreadOnly ? mapped.filter((i) => i.read) : mapped
        return {
          ...page,
          items,
          unreadTotal: unreadOnly ? 0 : unreadLeft,
          total: unreadOnly ? items.length : page.total,
        }
      }),
    }
  })

  qc.setQueriesData<Record<string, number>>({ queryKey: ['unread-counts'] }, (old) => {
    if (!old) return old
    if (scopedType) {
      const prevType = Number(old[scopedType] ?? 0)
      const next = { ...old, [scopedType]: 0 }
      if (typeof next.total === 'number') {
        next.total = Math.max(0, next.total - prevType)
      }
      return next
    }
    // Display-scope mark-all: only subtract unread count visible in feed caches
    // for those sourceIds — never zero the global badge (out-of-scope unread remains).
    if (scopedIds && scopedIds.length > 0) {
      let marked = 0
      for (const [, data] of prevFeed) {
        const pages = (data as InfiniteData<FeedPage> | undefined)?.pages
        if (!pages) continue
        for (const page of pages) {
          for (const item of page.items) {
            if (!item.read && itemMatchesDisplay(item, scopedIds)) marked += 1
          }
        }
      }
      if (marked === 0) return old
      const next = { ...old }
      if (typeof next.total === 'number') {
        next.total = Math.max(0, next.total - marked)
      }
      return next
    }
    const next: Record<string, number> = { total: 0 }
    for (const key of Object.keys(old)) {
      if (key !== 'total') next[key] = 0
    }
    return next
  })

  return { prevFeed, prevUnread }
}

export function rollbackMarkAllRead(
  qc: QueryClient,
  snapshot: {
    prevFeed: ReturnType<QueryClient['getQueriesData']>
    prevUnread: ReturnType<QueryClient['getQueriesData']>
  },
) {
  for (const [key, data] of snapshot.prevFeed) qc.setQueryData(key, data)
  for (const [key, data] of snapshot.prevUnread) qc.setQueryData(key, data)
}
