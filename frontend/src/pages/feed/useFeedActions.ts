import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api, type Item } from '../../lib/api'
import { useToast } from '../../components/ui'
import {
  patchFeedItemInCache,
  patchUnreadCountsInCache,
  useMarkItemRead,
} from '../../hooks/useMarkItemRead'
import { useEngagement } from '../../hooks/useEngagement'
import { errorText } from '../../lib/errors'
import { optimisticMarkAllRead, rollbackMarkAllRead } from './optimisticMarkAllRead'

type PatchVars = {
  id: number
  read?: boolean
  saved?: boolean
  dismissed?: boolean
  sourceType?: string
  /** Previous saved state for rollback / toggle toasts. */
  wasSaved?: boolean
  wasRead?: boolean
}

export function useFeedActions(unreadOnly: boolean) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const engagement = useEngagement()
  const [confirmMarkAllOpen, setConfirmMarkAllOpen] = useState(false)

  const patch = useMutation({
    mutationFn: ({ id, read, saved, dismissed }: PatchVars) =>
      api.patchItem(id, { read, saved, dismissed }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['feed'] })
      await qc.cancelQueries({ queryKey: ['feed-search'] })
      await qc.cancelQueries({ queryKey: ['unread-counts'] })
      const prevFeed = qc.getQueriesData({ queryKey: ['feed'] })
      const prevSearch = qc.getQueriesData({ queryKey: ['feed-search'] })
      const prevUnread = qc.getQueriesData<Record<string, number>>({ queryKey: ['unread-counts'] })

      if (vars.dismissed) {
        patchFeedItemInCache(qc, vars.id, { dismissed: true, read: true }, { remove: true })
        if (!vars.wasRead) patchUnreadCountsInCache(qc, -1, vars.sourceType)
      } else {
        const patchFields: Partial<Item> = {}
        if (vars.read != null) patchFields.read = vars.read
        if (vars.saved != null) patchFields.saved = vars.saved
        const remove = unreadOnly && vars.read === true
        patchFeedItemInCache(qc, vars.id, patchFields, { remove })
        if (vars.read === true && !vars.wasRead) {
          patchUnreadCountsInCache(qc, -1, vars.sourceType)
        }
        if (vars.read === false && vars.wasRead) {
          patchUnreadCountsInCache(qc, 1, vars.sourceType)
        }
      }
      return { prevFeed, prevSearch, prevUnread }
    },
    onSuccess: (_data, vars) => {
      if (vars.dismissed) {
        void qc.invalidateQueries({ queryKey: ['preference-keywords'] })
        if (!vars.wasRead) engagement.bumpRead(1)
        pushToast('success', t('feed.notInterestedDone'), {
          label: t('common.undo'),
          onClick: () => {
            void api
              .patchItem(vars.id, { dismissed: false })
              .then(() => {
                void qc.invalidateQueries({ queryKey: ['feed'] })
                void qc.invalidateQueries({ queryKey: ['unread-counts'] })
              })
              .catch(() => undefined)
          },
        })
      } else {
        if (vars.read === true && !vars.wasRead) engagement.bumpRead(1)
        if (vars.saved != null && vars.saved !== vars.wasSaved) {
          void qc.invalidateQueries({ queryKey: ['preference-keywords'] })
          void qc.invalidateQueries({ queryKey: ['actions'] })
          void qc.invalidateQueries({ queryKey: ['watching-saved'] })
          if (vars.saved) {
            pushToast('success', t('feed.savedHint'), {
              label: t('nav.watching'),
              onClick: () => navigate('/watching'),
            })
          } else {
            pushToast('success', t('feed.unsavedHint'), {
              label: t('common.undo'),
              onClick: () => {
                void api
                  .patchItem(vars.id, { saved: true })
                  .then(() => {
                    void qc.invalidateQueries({ queryKey: ['feed'] })
                    void qc.invalidateQueries({ queryKey: ['watching-saved'] })
                  })
                  .catch(() => undefined)
              },
            })
          }
        } else if (vars.read === true && !vars.wasRead) {
          // Keyboard `m` / explicit mark-read — Undo restores list (esp. unread-only).
          pushToast('success', t('feed.markedRead'), {
            label: t('common.undo'),
            onClick: () => {
              void api
                .patchItem(vars.id, { read: false })
                .then(() => {
                  void qc.invalidateQueries({ queryKey: ['feed'] })
                  void qc.invalidateQueries({ queryKey: ['unread-counts'] })
                })
                .catch(() => undefined)
            },
          })
        } else if (vars.read === false && vars.wasRead) {
          pushToast('success', t('feed.markedUnread'), {
            label: t('common.undo'),
            onClick: () => {
              void api
                .patchItem(vars.id, { read: true })
                .then(() => {
                  void qc.invalidateQueries({ queryKey: ['feed'] })
                  void qc.invalidateQueries({ queryKey: ['unread-counts'] })
                })
                .catch(() => undefined)
            },
          })
        }
      }
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

  const markAll = useMutation({
    mutationFn: (q: string = '') => api.markAllRead(q),
    onMutate: async (q: string = '') => {
      await qc.cancelQueries({ queryKey: ['feed'] })
      await qc.cancelQueries({ queryKey: ['unread-counts'] })
      return optimisticMarkAllRead(qc, q, { unreadOnly })
    },
    onSuccess: (data, _q, ctx) => {
      engagement.bumpRead(1)
      const ids = data.ids ?? []
      const msg = engagement.claimInboxZero()
        ? t(engagement.inboxZeroToastKey())
        : t('feed.markAllReadDone')
      if (ids.length > 0 && ctx) {
        pushToast('success', msg, {
          label: t('common.undo'),
          onClick: () => {
            rollbackMarkAllRead(qc, ctx)
            void api
              .batchItems({ ids, read: false })
              .then(() => {
                void qc.invalidateQueries({ queryKey: ['feed'] })
                void qc.invalidateQueries({ queryKey: ['unread-counts'] })
              })
              .catch(() => undefined)
          },
        })
      } else {
        pushToast('success', msg)
      }
    },
    onError: (err, _q, ctx) => {
      if (ctx) rollbackMarkAllRead(qc, ctx)
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['feed'] })
      void qc.invalidateQueries({ queryKey: ['unread-counts'] })
    },
  })

  const markItemRead = useMarkItemRead()
  const markItemReadMutate = markItemRead.mutate

  const markReadOnOpen = useCallback(
    (item: Item, opts?: { silent?: boolean }) => {
      if (item.read) return
      markItemReadMutate({
        id: item.id,
        read: true,
        silent: opts?.silent,
        sourceType: item.primarySourceType,
      })
    },
    [markItemReadMutate],
  )

  const openExternalAndMarkRead = useCallback(
    (item: Item) => {
      if (!item.canonicalUrl) return
      window.open(item.canonicalUrl, '_blank', 'noopener')
      markReadOnOpen(item)
    },
    [markReadOnOpen],
  )

  const toggleSaved = useCallback(
    (item: Item) =>
      patch.mutate({
        id: item.id,
        saved: !item.saved,
        wasSaved: item.saved,
        wasRead: item.read,
        sourceType: item.primarySourceType,
      }),
    [patch],
  )
  /** Swipe / collect: always save (never toggle off). */
  const saveItem = useCallback(
    (item: Item) => {
      if (!item.saved) {
        patch.mutate({
          id: item.id,
          saved: true,
          wasSaved: false,
          wasRead: item.read,
          sourceType: item.primarySourceType,
        })
      }
    },
    [patch],
  )
  const markItemSelectedRead = useCallback(
    (item: Item) => {
      if (item.read) return
      patch.mutate({
        id: item.id,
        read: true,
        wasRead: false,
        wasSaved: item.saved,
        sourceType: item.primarySourceType,
      })
    },
    [patch],
  )
  const markItemUnread = useCallback(
    (item: Item) => {
      if (!item.read) return
      patch.mutate({
        id: item.id,
        read: false,
        wasRead: true,
        wasSaved: item.saved,
        sourceType: item.primarySourceType,
      })
    },
    [patch],
  )
  const dismissItem = useCallback(
    (item: Item) =>
      patch.mutate({
        id: item.id,
        dismissed: true,
        wasRead: item.read,
        wasSaved: item.saved,
        sourceType: item.primarySourceType,
      }),
    [patch],
  )

  return {
    patch,
    markAll,
    confirmMarkAllOpen,
    setConfirmMarkAllOpen,
    markReadOnOpen,
    openExternalAndMarkRead,
    toggleSaved,
    saveItem,
    markItemSelectedRead,
    markItemUnread,
    dismissItem,
  }
}
