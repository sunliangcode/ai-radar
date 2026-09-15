import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { PageHeader, useToast } from '../components/ui'
import { useMarkItemRead } from '../hooks/useMarkItemRead'
import { dateLocale } from '../i18n'
import { errorText } from '../lib/errors'
import { TimelineSection, TIMELINE_PREVIEW } from './watching/TimelineSection'
import { TrackedChangesSection } from './watching/TrackedChangesSection'
import { SavedItemsSection } from './watching/SavedItemsSection'

export default function WatchingPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const locale = dateLocale(i18n.language)
  const markItemRead = useMarkItemRead()
  const [showAllTimeline, setShowAllTimeline] = useState(false)

  const changes = useQuery({ queryKey: ['changes-watching'], queryFn: () => api.changes(40) })
  const saved = useQuery({
    queryKey: ['watching-saved'],
    queryFn: () => api.items('?saved=true&sort=score&limit=50'),
  })
  const timeline = useQuery({ queryKey: ['watching-timeline'], queryFn: api.watchingTimeline })

  const patchItem = useMutation({
    mutationFn: ({ id, saved, read }: { id: number; saved?: boolean; read?: boolean }) =>
      api.patchItem(id, { saved, read }),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ['watching-saved'] })
      await qc.invalidateQueries({ queryKey: ['watching'] })
      await qc.invalidateQueries({ queryKey: ['feed'] })
      if (vars.saved === false) {
        pushToast('success', t('watching.unsaved'), {
          label: t('common.undo'),
          onClick: () => {
            void api
              .patchItem(vars.id, { saved: true })
              .then(() => qc.invalidateQueries({ queryKey: ['watching-saved'] }))
              .catch(() => undefined)
          },
        })
      }
    },
    onError: (err) => {
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
    },
  })

  const tracked = (changes.data ?? []).filter(
    (c) => c.tier === 'HIGH' || c.tier === 'MEDIUM' || c.status === 'WATCHING',
  )
  const savedItems = saved.data?.items ?? []
  const groups = timeline.data?.groups ?? []
  const visibleGroups = showAllTimeline ? groups : groups.slice(0, TIMELINE_PREVIEW)

  return (
    <div>
      <PageHeader
        title={t('watching.title')}
        subtitle={t('watching.subtitle')}
        actions={
          <Link to="/actions" className="text-sm text-moss underline underline-offset-2">
            {t('watching.openActions')}
          </Link>
        }
      />

      <TimelineSection
        groups={groups}
        visibleGroups={visibleGroups}
        showAll={showAllTimeline}
        locale={locale}
        onToggleShowAll={() => setShowAllTimeline((v) => !v)}
      />

      <TrackedChangesSection
        tracked={tracked}
        loading={changes.isLoading}
        error={changes.isError ? changes.error : null}
        locale={locale}
        onRetry={() => void changes.refetch()}
      />

      <SavedItemsSection
        items={savedItems}
        loading={saved.isLoading}
        error={saved.isError ? saved.error : null}
        locale={locale}
        patchPending={patchItem.isPending}
        onRetry={() => void saved.refetch()}
        onMarkRead={(id) => patchItem.mutate({ id, read: true })}
        onUnsave={(id) => patchItem.mutate({ id, saved: false })}
        onOpenExternal={(item) => {
          if (!item.read) markItemRead.mutate({ id: item.id, read: true })
        }}
      />
    </div>
  )
}
