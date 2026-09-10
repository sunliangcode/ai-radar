import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, type Item } from '../lib/api'
import { useToast } from '../components/ui'

type FeedPageData = { items: Item[]; total: number; offset?: number; limit?: number }

/** Update item fields in cached feed lists without refetching (avoids unread-first reorder jump). */
export function patchFeedItemInCache(
  qc: QueryClient,
  id: number,
  patch: Partial<Item>,
  opts?: { remove?: boolean },
) {
  qc.setQueriesData<FeedPageData>({ queryKey: ['feed'] }, (old) => {
    if (!old?.items) return old
    if (opts?.remove) {
      const items = old.items.filter((i) => i.id !== id)
      return { ...old, items, total: Math.max(0, (old.total ?? items.length) - 1) }
    }
    return {
      ...old,
      items: old.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }
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

/**
 * Mark an item as read (e.g. when the user opens the original source).
 * Updates list in place so order stays stable; shows an undo toast on success.
 */
export function useMarkItemRead() {
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ id, read }: { id: number; read: boolean }) => api.patchItem(id, { read }),
    onSuccess: async (_data, vars) => {
      patchFeedItemInCache(qc, vars.id, { read: vars.read })
      void qc.invalidateQueries({ queryKey: ['unread-counts'] })
      if (!vars.read) return
      pushToast('success', t('feed.markedRead'), {
        label: t('common.undo'),
        onClick: () => {
          void api
            .patchItem(vars.id, { read: false })
            .then(() => {
              patchFeedItemInCache(qc, vars.id, { read: false })
              void qc.invalidateQueries({ queryKey: ['unread-counts'] })
            })
            .catch(() => undefined)
        },
      })
    },
    onError: (err) => {
      pushToast('error', t('common.loadFailed', { message: (err as Error).message }))
    },
  })
}
