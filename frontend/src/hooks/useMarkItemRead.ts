import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, type Item } from '../lib/api'
import { useToast } from '../components/ui'
import { useEngagement } from './useEngagement'
import { errorText } from '../lib/errors'
import type { FeedPage } from '../pages/feed/useFeedList'

type FlatFeed = { items: Item[]; total: number; offset?: number; limit?: number }

export type MarkItemReadVars = {
  id: number
  read: boolean
  /** Skip success toast (e.g. auto-read when opening the drawer). */
  silent?: boolean
  /** Optional source type for optimistic unread badge adjustment. */
  sourceType?: string
}

function isInfiniteFeed(old: unknown): old is InfiniteData<FeedPage> {
  return Boolean(old && typeof old === 'object' && Array.isArray((old as InfiniteData<FeedPage>).pages))
}

function isFlatFeed(old: unknown): old is FlatFeed {
  return Boolean(
    old &&
      typeof old === 'object' &&
      Array.isArray((old as FlatFeed).items) &&
      !('pages' in (old as object)),
  )
}

/** Update item fields in cached feed lists without refetching (avoids unread-first reorder jump). */
export function patchFeedItemInCache(
  qc: QueryClient,
  id: number,
  patch: Partial<Item>,
  opts?: { remove?: boolean },
) {
  qc.setQueriesData<InfiniteData<FeedPage> | FlatFeed>({ queryKey: ['feed'] }, (old) => {
    if (!old) return old
    if (isInfiniteFeed(old)) {
      return {
        ...old,
        pages: old.pages.map((page) => {
          if (!page?.items) return page
          if (opts?.remove) {
            const items = page.items.filter((i) => i.id !== id)
            return {
              ...page,
              items,
              total: Math.max(0, (page.total ?? items.length) - 1),
            }
          }
          return {
            ...page,
            items: page.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
          }
        }),
      }
    }
    if (isFlatFeed(old)) {
      if (opts?.remove) {
        const items = old.items.filter((i) => i.id !== id)
        return { ...old, items, total: Math.max(0, (old.total ?? items.length) - 1) }
      }
      return {
        ...old,
        items: old.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      }
    }
    return old
  })

  qc.setQueriesData<{ items: Item[]; total: number }>({ queryKey: ['feed-search'] }, (old) => {
    if (!old?.items) return old
    if (opts?.remove) {
      const items = old.items.filter((i) => i.id !== id)
      return { ...old, items, total: items.length }
    }
    return {
      ...old,
      items: old.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }
  })
}

/** Adjust sidebar / tab unread badges immediately when read state flips. */
export function patchUnreadCountsInCache(
  qc: QueryClient,
  delta: number,
  sourceType?: string,
) {
  if (delta === 0) return
  qc.setQueriesData<Record<string, number>>({ queryKey: ['unread-counts'] }, (old) => {
    if (!old) return old
    const next = { ...old }
    if (typeof next.total === 'number') {
      next.total = Math.max(0, next.total + delta)
    }
    if (sourceType && typeof next[sourceType] === 'number') {
      next[sourceType] = Math.max(0, next[sourceType] + delta)
    }
    return next
  })
}

/**
 * Mark an item as read (e.g. when the user opens the original source).
 * Optimistic cache update so the unread dot clears instantly; undo toast unless silent.
 */
export function useMarkItemRead() {
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const { t } = useTranslation()
  const engagement = useEngagement()

  return useMutation({
    mutationFn: ({ id, read }: MarkItemReadVars) => api.patchItem(id, { read }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['feed'] })
      await qc.cancelQueries({ queryKey: ['feed-search'] })
      await qc.cancelQueries({ queryKey: ['unread-counts'] })
      const prevFeed = qc.getQueriesData({ queryKey: ['feed'] })
      const prevSearch = qc.getQueriesData({ queryKey: ['feed-search'] })
      const prevUnread = qc.getQueriesData<Record<string, number>>({ queryKey: ['unread-counts'] })
      patchFeedItemInCache(qc, vars.id, { read: vars.read })
      if (vars.read) {
        patchUnreadCountsInCache(qc, -1, vars.sourceType)
      } else {
        patchUnreadCountsInCache(qc, 1, vars.sourceType)
      }
      return { prevFeed, prevSearch, prevUnread }
    },
    onSuccess: (_data, vars) => {
      if (vars.read) engagement.bumpRead(1)
      if (vars.silent || !vars.read) return
      pushToast('success', t('feed.markedRead'), {
        label: t('common.undo'),
        onClick: () => {
          void api
            .patchItem(vars.id, { read: false })
            .then(() => {
              patchFeedItemInCache(qc, vars.id, { read: false })
              patchUnreadCountsInCache(qc, 1, vars.sourceType)
              void qc.invalidateQueries({ queryKey: ['unread-counts'] })
            })
            .catch(() => undefined)
        },
      })
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prevFeed) {
        for (const [key, data] of ctx.prevFeed) qc.setQueryData(key, data)
      }
      if (ctx?.prevSearch) {
        for (const [key, data] of ctx.prevSearch) qc.setQueryData(key, data)
      }
      if (ctx?.prevUnread) {
        for (const [key, data] of ctx.prevUnread) qc.setQueryData(key, data)
      }
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['unread-counts'] })
    },
  })
}
