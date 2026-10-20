import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { patchFeedItemInCache, patchUnreadCountsInCache } from './useMarkItemRead'
import type { Item } from '../lib/api'

function item(partial: Partial<Item> & { id: number }): Item {
  return {
    title: 't',
    canonicalUrl: 'https://example.com',
    read: false,
    saved: false,
    ...partial,
  } as Item
}

describe('patchFeedItemInCache', () => {
  it('patches infinite feed pages in place', () => {
    const qc = new QueryClient()
    qc.setQueryData(['feed', '24h'], {
      pages: [{ items: [item({ id: 1 }), item({ id: 2 })], total: 2, nextCursor: null, hasMore: false }],
      pageParams: [null],
    })
    patchFeedItemInCache(qc, 1, { read: true })
    const data = qc.getQueryData<{ pages: { items: Item[] }[] }>(['feed', '24h'])
    expect(data?.pages[0].items[0].read).toBe(true)
    expect(data?.pages[0].items[1].read).toBe(false)
  })

  it('removes an item and decrements total', () => {
    const qc = new QueryClient()
    qc.setQueryData(['feed', 'x'], {
      pages: [{ items: [item({ id: 1 }), item({ id: 2 })], total: 2 }],
      pageParams: [null],
    })
    patchFeedItemInCache(qc, 1, { read: true }, { remove: true })
    const data = qc.getQueryData<{ pages: { items: Item[]; total: number }[] }>(['feed', 'x'])
    expect(data?.pages[0].items.map((i) => i.id)).toEqual([2])
    expect(data?.pages[0].total).toBe(1)
  })
})

describe('patchUnreadCountsInCache', () => {
  it('decrements total and source type', () => {
    const qc = new QueryClient()
    qc.setQueryData(['unread-counts'], { total: 5, RSS: 3, GITHUB: 2 })
    patchUnreadCountsInCache(qc, -1, 'RSS')
    expect(qc.getQueryData(['unread-counts'])).toEqual({ total: 4, RSS: 2, GITHUB: 2 })
  })

  it('patches scoped unread-counts query keys', () => {
    const qc = new QueryClient()
    qc.setQueryData(['unread-counts', 'sourceIds=1,2'], { total: 3, RSS: 3 })
    patchUnreadCountsInCache(qc, -1, 'RSS')
    expect(qc.getQueryData(['unread-counts', 'sourceIds=1,2'])).toEqual({ total: 2, RSS: 2 })
  })

  it('clamps at zero', () => {
    const qc = new QueryClient()
    qc.setQueryData(['unread-counts'], { total: 0, RSS: 0 })
    patchUnreadCountsInCache(qc, -1, 'RSS')
    expect(qc.getQueryData(['unread-counts'])).toEqual({ total: 0, RSS: 0 })
  })
})
