import { describe, expect, it, vi } from 'vitest'
import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { optimisticMarkAllRead, rollbackMarkAllRead } from './optimisticMarkAllRead'
import type { FeedPage } from './useFeedList'

function mockQc(initial: {
  feed?: InfiniteData<FeedPage>
  unread?: Record<string, number>
}) {
  const store = new Map<string, unknown>()
  if (initial.feed) store.set(JSON.stringify(['feed']), initial.feed)
  if (initial.unread) store.set(JSON.stringify(['unread-counts']), initial.unread)

  return {
    getQueriesData: ({ queryKey }: { queryKey: string[] }) => {
      const key = JSON.stringify(queryKey)
      const val = store.get(key)
      return val == null ? [] : ([[queryKey, val]] as const)
    },
    setQueriesData: (
      { queryKey }: { queryKey: string[] },
      updater: (old: unknown) => unknown,
    ) => {
      const key = JSON.stringify(queryKey)
      const old = store.get(key)
      store.set(key, updater(old))
    },
    setQueryData: (queryKey: unknown[], data: unknown) => {
      store.set(JSON.stringify(queryKey), data)
    },
    _store: store,
  } as unknown as QueryClient & { _store: Map<string, unknown> }
}

describe('optimisticMarkAllRead', () => {
  it('zeros unread badges and marks feed items read', () => {
    const feed: InfiniteData<FeedPage> = {
      pages: [
        {
          items: [
            { id: 1, title: 'a', canonicalUrl: 'u', read: false } as FeedPage['items'][0],
            { id: 2, title: 'b', canonicalUrl: 'u', read: true } as FeedPage['items'][0],
          ],
          total: 2,
          unreadTotal: 1,
        },
      ],
      pageParams: [null],
    }
    const qc = mockQc({
      feed,
      unread: { total: 3, RSS: 2, GITHUB: 1 },
    })

    const snap = optimisticMarkAllRead(qc, '')
    const nextFeed = qc._store.get(JSON.stringify(['feed'])) as InfiniteData<FeedPage>
    const nextUnread = qc._store.get(JSON.stringify(['unread-counts'])) as Record<string, number>

    expect(nextFeed.pages[0].items.every((i) => i.read)).toBe(true)
    expect(nextFeed.pages[0].unreadTotal).toBe(0)
    expect(nextUnread).toEqual({ total: 0, RSS: 0, GITHUB: 0 })

    rollbackMarkAllRead(qc, snap)
    expect(qc._store.get(JSON.stringify(['unread-counts']))).toEqual({
      total: 3,
      RSS: 2,
      GITHUB: 1,
    })
  })

  it('scopes unread zeroing when sourceType is present', () => {
    const qc = mockQc({
      unread: { total: 5, RSS: 3, GITHUB: 2 },
    })
    vi.spyOn(qc, 'setQueriesData')
    optimisticMarkAllRead(qc, '?sourceType=RSS')
    const nextUnread = qc._store.get(JSON.stringify(['unread-counts'])) as Record<string, number>
    expect(nextUnread.RSS).toBe(0)
    expect(nextUnread.GITHUB).toBe(2)
    expect(nextUnread.total).toBe(2)
  })

  it('does not zero global unread when sourceIds scope is set', () => {
    const feed: InfiniteData<FeedPage> = {
      pages: [
        {
          items: [
            {
              id: 1,
              title: 'a',
              canonicalUrl: 'u',
              read: false,
              primarySourceId: '1',
            } as FeedPage['items'][0],
            {
              id: 2,
              title: 'b',
              canonicalUrl: 'u',
              read: false,
              primarySourceId: '9',
            } as FeedPage['items'][0],
          ],
          total: 2,
          unreadTotal: 2,
        },
      ],
      pageParams: [null],
    }
    const qc = mockQc({
      feed,
      unread: { total: 10, RSS: 8, GITHUB: 2 },
    })
    optimisticMarkAllRead(qc, '?sourceIds=1')
    const nextUnread = qc._store.get(JSON.stringify(['unread-counts'])) as Record<string, number>
    // Only the in-scope unread item (id 1) is subtracted from total.
    expect(nextUnread.total).toBe(9)
    expect(nextUnread.RSS).toBe(8)
    expect(nextUnread.GITHUB).toBe(2)
  })
})
