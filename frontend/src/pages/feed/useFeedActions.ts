import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type Item } from '../../lib/api'
import { useToast } from '../../components/ui'
import { patchFeedItemInCache, useMarkItemRead } from '../../hooks/useMarkItemRead'
import { useEngagement } from '../../hooks/useEngagement'
import { errorText } from '../../lib/errors'

export function useFeedActions(unreadOnly: boolean) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const engagement = useEngagement()
  const [confirmMarkAllOpen, setConfirmMarkAllOpen] = useState(false)

  const patch = useMutation({
    mutationFn: ({
      id,
      read,
      saved,
      dismissed,
    }: {
      id: number
      read?: boolean
      saved?: boolean
      dismissed?: boolean
    }) => api.patchItem(id, { read, saved, dismissed }),
    onSuccess: (_data, vars) => {
      if (vars.dismissed) {
        patchFeedItemInCache(qc, vars.id, { dismissed: true, read: true }, { remove: true })
        void qc.invalidateQueries({ queryKey: ['preference-keywords'] })
        engagement.bumpRead(1)
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
        const patchFields: Partial<Item> = {}
        if (vars.read != null) patchFields.read = vars.read
        if (vars.saved != null) patchFields.saved = vars.saved
        const remove = unreadOnly && vars.read === true
        patchFeedItemInCache(qc, vars.id, patchFields, { remove })
        if (vars.read === true) engagement.bumpRead(1)
        if (vars.saved) {
          void qc.invalidateQueries({ queryKey: ['preference-keywords'] })
          void qc.invalidateQueries({ queryKey: ['actions'] })
          void qc.invalidateQueries({ queryKey: ['watching'] })
          pushToast('success', t('feed.savedHint'))
        }
      }
      void qc.invalidateQueries({ queryKey: ['unread-counts'] })
    },
    onError: (err, vars) => {
      if (vars.dismissed) {
        void qc.invalidateQueries({ queryKey: ['feed'] })
      }
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
    },
  })

  const markAll = useMutation({
    mutationFn: api.markAllRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feed'] })
      void qc.invalidateQueries({ queryKey: ['unread-counts'] })
      engagement.bumpRead(1)
      if (engagement.claimInboxZero()) {
        pushToast('success', t(engagement.inboxZeroToastKey()))
      } else {
        pushToast('success', t('feed.markAllReadDone'))
      }
    },
    onError: (err) => {
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
    },
  })

  const markItemRead = useMarkItemRead()
  const markItemReadMutate = markItemRead.mutate

  const markReadOnOpen = useCallback(
    (item: Item) => {
      if (!item.read) markItemReadMutate({ id: item.id, read: true })
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
    (item: Item) => patch.mutate({ id: item.id, saved: !item.saved }),
    [patch],
  )
  /** Swipe / collect: always save (never toggle off). */
  const saveItem = useCallback(
    (item: Item) => {
      if (!item.saved) patch.mutate({ id: item.id, saved: true })
    },
    [patch],
  )
  const markItemSelectedRead = useCallback(
    (item: Item) => patch.mutate({ id: item.id, read: true }),
    [patch],
  )
  const dismissItem = useCallback(
    (item: Item) => patch.mutate({ id: item.id, dismissed: true }),
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
    dismissItem,
  }
}
