import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { Button, EmptyState, PageHeader, useToast } from '../components/ui'
import { useMarkItemRead } from '../hooks/useMarkItemRead'
import { useDisplaySources } from '../hooks/useDisplaySources'
import { useEscapeBack } from '../hooks/useEscapeBack'
import { changeMatchesDisplay } from '../lib/sourceFilter'
import { dateLocale } from '../i18n'
import { errorText } from '../lib/errors'
import { cn, focusRingClass, textLinkClass } from '../lib/cn'
import { TimelineSection, TIMELINE_PREVIEW } from './watching/TimelineSection'
import { TrackedChangesSection } from './watching/TrackedChangesSection'
import { SavedItemsSection } from './watching/SavedItemsSection'

export default function WatchingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const locale = dateLocale(i18n.language)
  const markItemRead = useMarkItemRead()
  const { sourceIdsQuery, displaySourceIds, noneSelected, setAllDisplayed } = useDisplaySources()
  const [showAllTimeline, setShowAllTimeline] = useState(false)

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/')
  }, [navigate])
  useEscapeBack(goBack)

  const changes = useQuery({ queryKey: ['changes-watching'], queryFn: () => api.changes(40) })
  const saved = useQuery({
    queryKey: ['watching-saved', sourceIdsQuery],
    queryFn: () =>
      api.items(
        `?saved=true&sort=score&limit=50${sourceIdsQuery ? `&${sourceIdsQuery}` : ''}`,
      ),
  })
  const timeline = useQuery({ queryKey: ['watching-timeline'], queryFn: api.watchingTimeline })

  const patchItem = useMutation({
    mutationFn: ({ id, saved, read }: { id: number; saved?: boolean; read?: boolean }) =>
      api.patchItem(id, { saved, read }),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ['watching-saved'] })
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

  const unwatchMut = useMutation({
    mutationFn: (changeId: number) => api.deleteWatch(changeId),
    onMutate: async (changeId) => {
      await qc.cancelQueries({ queryKey: ['watching-timeline'] })
      await qc.cancelQueries({ queryKey: ['intelligence-home'] })
      const prevTimeline = qc.getQueryData<{ groups: { eventId: number }[]; count: number }>([
        'watching-timeline',
      ])
      const prevHome = qc.getQueryData<{ following?: { eventId?: number; changeId?: number }[] }>([
        'intelligence-home',
      ])
      qc.setQueryData<{ groups: { eventId: number }[]; count: number }>(
        ['watching-timeline'],
        (old) => {
          if (!old) return old
          const groups = old.groups.filter((g) => g.eventId !== changeId)
          return { ...old, groups, count: groups.length }
        },
      )
      qc.setQueryData(['intelligence-home'], (old: typeof prevHome) => {
        if (!old?.following) return old
        return {
          ...old,
          following: old.following.filter(
            (c) => (c.eventId ?? c.changeId) !== changeId,
          ),
        }
      })
      return { prevTimeline, prevHome }
    },
    onSuccess: (_data, changeId) => {
      pushToast('success', t('today.unfollowed'), {
        label: t('common.undo'),
        onClick: () => {
          void api
            .putWatch(changeId, { capability: true, api: true })
            .then(() => {
              void qc.invalidateQueries({ queryKey: ['watching-timeline'] })
              void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
              void qc.invalidateQueries({ queryKey: ['changes-watching'] })
            })
            .catch(() => undefined)
        },
      })
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prevTimeline) qc.setQueryData(['watching-timeline'], ctx.prevTimeline)
      if (ctx?.prevHome) qc.setQueryData(['intelligence-home'], ctx.prevHome)
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['watching-timeline'] })
      void qc.invalidateQueries({ queryKey: ['changes-watching'] })
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
    },
  })

  const groups = (timeline.data?.groups ?? []).filter((g) =>
    changeMatchesDisplay(g, displaySourceIds),
  )
  const watchedIds = new Set(groups.map((g) => g.eventId))
  // Following page: only actively followed changes (timeline source of truth).
  const tracked = (changes.data ?? [])
    .filter((c) => changeMatchesDisplay(c, displaySourceIds))
    .filter((c) => watchedIds.has(c.id) || watchedIds.has(c.eventId))
  const savedItems = saved.data?.items ?? []
  const visibleGroups = showAllTimeline ? groups : groups.slice(0, TIMELINE_PREVIEW)

  return (
    <div
      aria-busy={
        changes.isFetching ||
        saved.isFetching ||
        timeline.isFetching ||
        patchItem.isPending ||
        unwatchMut.isPending ||
        undefined
      }
    >
      <PageHeader
        titleId="watching-page-heading"
        title={t('watching.title')}
        subtitle={t('watching.subtitle')}
        actions={
          <Link
            to="/actions"
            className={`inline-flex min-h-9 items-center text-sm ${textLinkClass('moss')}`}
            aria-label={t('watching.openActions')}
          >
            {t('watching.openActions')}
          </Link>
        }
      />

      {noneSelected ? (
        <EmptyState
          title={t('sources.displayNoneActive')}
          description={t('watching.displayNoneHint')}
          primary={
            <Button onClick={setAllDisplayed} aria-label={t('sources.displayRestoreAll')}>
              {t('sources.displayRestoreAll')}
            </Button>
          }
          secondary={
            <Link
              to="/settings/sources"
              className={cn(
                'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
                focusRingClass(),
              )}
            >
              {t('nav.sources')}
            </Link>
          }
        />
      ) : (
        <>
          <TimelineSection
            groups={groups}
            visibleGroups={visibleGroups}
            showAll={showAllTimeline}
            locale={locale}
            loading={timeline.isLoading}
            error={timeline.isError ? timeline.error : null}
            onRetry={() => void timeline.refetch()}
            onToggleShowAll={() => setShowAllTimeline((v) => !v)}
            onUnwatch={(id) => unwatchMut.mutate(id)}
            unwatchPendingId={unwatchMut.isPending ? (unwatchMut.variables ?? null) : null}
          />

          <TrackedChangesSection
            tracked={tracked}
            loading={changes.isLoading}
            error={changes.isError ? changes.error : null}
            locale={locale}
            onRetry={() => void changes.refetch()}
            watchedIds={watchedIds}
            onUnwatch={(id) => unwatchMut.mutate(id)}
            unwatchPendingId={unwatchMut.isPending ? (unwatchMut.variables ?? null) : null}
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
        </>
      )}
    </div>
  )
}
