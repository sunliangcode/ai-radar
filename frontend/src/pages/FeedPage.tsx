import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { errorText } from '../lib/errors'
import { isAriaModalOpen, prefersReducedMotion } from '../lib/a11y'
import { cleanFeedLead } from '../lib/cleanFeedLead'
import {
  loadExploreView,
  saveExploreView,
  type ExploreView,
} from '../lib/engagement'
import {
  Button,
  buttonVariants,
  ConfirmDialog,
  EmptyState,
  QueryErrorState,
  ImmersiveDrawer,
  ItemDetailBody,
  ListSkeleton,
  MagAction,
  MagCard,
  MagGrid,
  PageHeader,
  SourceBadge,
} from '../components/ui'
import { useQueryClient } from '@tanstack/react-query'
import { InboxZeroBurst } from '../components/engagement/InboxZeroBurst'
import { FetchProgressSection } from '../components/fetch/FetchProgressSection'
import { timeAgo } from '../components/magazine/timeAgo'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { patchFeedItemInCache } from '../hooks/useMarkItemRead'
import { useEngagement } from '../hooks/useEngagement'
import { useUnreadCounts } from '../hooks/useUnreadCounts'
import { dateLocale } from '../i18n'
import { cn } from '../lib/cn'
import { FeedToolbar } from './feed/FeedToolbar'
import { useFeedKeyboard } from './feed/useFeedKeyboard'
import { useFeedList } from './feed/useFeedList'
import { useFeedActions } from './feed/useFeedActions'
import type { Item } from '../lib/api'

function scoreTier(score?: number): string | undefined {
  if (score == null) return undefined
  if (score >= 80) return 'HIGH'
  if (score >= 50) return 'MEDIUM'
  return 'LOW'
}

function nextItemId(items: Item[], selectedId: number | null): number | null {
  const idx = items.findIndex((i) => i.id === selectedId)
  const next = items[Math.min(items.length - 1, Math.max(0, idx) + 1)]
  return next?.id ?? null
}

function prevItemId(items: Item[], selectedId: number | null): number | null {
  const idx = items.findIndex((i) => i.id === selectedId)
  if (idx <= 0) return items[0]?.id ?? null
  return items[idx - 1]?.id ?? null
}

export default function FeedPage({
  forceUnread,
  hideTitle,
}: {
  forceUnread?: boolean
  hideTitle?: boolean
} = {}) {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const listRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const engagement = useEngagement()
  const unread = useUnreadCounts()
  const qc = useQueryClient()
  const [showInboxZero, setShowInboxZero] = useState(false)
  const prevUnread = useRef<number | null>(null)
  const drawerMarkedId = useRef<number | null>(null)
  const pendingFocusAdvance = useRef(false)

  const layoutParam = searchParams.get('layout')
  const [exploreView, setExploreView] = useState<ExploreView>(() => {
    if (layoutParam === 'focus') return 'focus'
    if (layoutParam === 'waterfall') return 'waterfall'
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      return 'focus'
    }
    return loadExploreView()
  })
  const [exiting, setExiting] = useState<{ id: number; dir: 'dismiss' | 'save' } | null>(null)

  const setView = useCallback(
    (v: ExploreView) => {
      setExploreView(v)
      saveExploreView(v)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (v === 'focus') next.set('layout', 'focus')
          else next.delete('layout')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  useEffect(() => {
    if (layoutParam === 'focus' && exploreView !== 'focus') setExploreView('focus')
    if (layoutParam === 'waterfall' && exploreView !== 'waterfall') setExploreView('waterfall')
  }, [layoutParam, exploreView])

  const runWithExit = useCallback(
    (item: Item, dir: 'dismiss' | 'save', action: () => void) => {
      if (prefersReducedMotion() || exiting?.id === item.id) {
        action()
        return
      }
      setExiting({ id: item.id, dir })
      window.setTimeout(() => {
        action()
        setExiting(null)
      }, 200)
    },
    [exiting?.id],
  )

  const { fetchJob, retryFailed, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['feed'],
    ['sources'],
    ['intelligence-home'],
    ['watching'],
  ])

  const list = useFeedList(!!progress?.running)

  useEffect(() => {
    if (forceUnread) list.setUnreadOnly(true)
  }, [forceUnread, list.setUnreadOnly])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || list.searchMode || !list.hasMore) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) list.loadMore()
      },
      { rootMargin: '240px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [list.searchMode, list.hasMore, list.loadMore])

  const actions = useFeedActions(list.unreadOnly)
  const filteredSource = Boolean(list.sourceType)
  const focusMode = exploreView === 'focus'

  const totalUnread = useMemo(() => {
    const m = unread.data ?? {}
    if (typeof m.total === 'number') return m.total
    return Object.entries(m).reduce((a, [k, b]) => (k === 'total' ? a : a + b), 0)
  }, [unread.data])

  useEffect(() => {
    if (prevUnread.current != null && prevUnread.current > 0 && totalUnread === 0) {
      if (engagement.claimInboxZero()) {
        setShowInboxZero(true)
      }
    }
    prevUnread.current = totalUnread
  }, [totalUnread, engagement])

  useEffect(() => {
    if (!shortcutsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (isAriaModalOpen()) return
      e.preventDefault()
      setShortcutsOpen(false)
      queueMicrotask(() => document.getElementById('feed-shortcuts-toggle')?.focus())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcutsOpen])

  useEffect(() => {
    if (!showInboxZero) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (isAriaModalOpen()) return
      e.preventDefault()
      setShowInboxZero(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showInboxZero])

  const focusSearch = useCallback(() => {
    document.getElementById('feed-search-input')?.focus()
  }, [])

  const openDrawer = useCallback((id: number) => {
    list.setSelectedId(id)
    setDrawerOpen(true)
  }, [list.setSelectedId])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    // Unread-only: drop the item after the reader closes so the list doesn't jump mid-read.
    const id = drawerMarkedId.current
    if (list.unreadOnly && id != null) {
      patchFeedItemInCache(qc, id, { read: true }, { remove: true })
    }
    drawerMarkedId.current = null
  }, [list.unreadOnly, qc])

  const pagePrev = useCallback(() => {
    /* Infinite feed: previous page is retained in memory; no-op. */
  }, [])

  const pageNext = useCallback(() => {
    list.loadMore()
  }, [list.loadMore])

  const selectItem = useCallback(
    (id: number) => {
      if (focusMode) {
        const cur = list.items.find((i) => i.id === list.selectedId)
        if (cur && !cur.read && cur.id !== id) {
          actions.markReadOnOpen(cur, { silent: true })
        }
      }
      list.setSelectedId(id)
    },
    [focusMode, list.items, list.selectedId, list.setSelectedId, actions.markReadOnOpen],
  )

  const goFocusNext = useCallback(() => {
    const nid = nextItemId(list.items, list.selectedId)
    if (nid != null && nid !== list.selectedId) {
      selectItem(nid)
      return
    }
    if (list.hasMore) {
      pendingFocusAdvance.current = true
      list.loadMore()
    }
  }, [list.items, list.selectedId, list.hasMore, list.loadMore, selectItem])

  const goFocusPrev = useCallback(() => {
    const pid = prevItemId(list.items, list.selectedId)
    if (pid != null) selectItem(pid)
  }, [list.items, list.selectedId, selectItem])

  useEffect(() => {
    if (!pendingFocusAdvance.current || !focusMode) return
    const nid = nextItemId(list.items, list.selectedId)
    if (nid != null && nid !== list.selectedId) {
      pendingFocusAdvance.current = false
      selectItem(nid)
    } else if (!list.isFetchingNextPage && !list.hasMore) {
      pendingFocusAdvance.current = false
    }
  }, [
    focusMode,
    list.items,
    list.selectedId,
    list.isFetchingNextPage,
    list.hasMore,
    selectItem,
  ])

  useFeedKeyboard({
    items: list.items,
    selectedId: list.selectedId,
    drawerOpen,
    focusMode,
    onSelect: selectItem,
    onOpenDrawer: openDrawer,
    onCloseDrawer: closeDrawer,
    onOpenExternal: actions.openExternalAndMarkRead,
    onToggleSaved: actions.toggleSaved,
    onDismiss: (item) => runWithExit(item, 'dismiss', () => actions.dismissItem(item)),
    onMarkRead: actions.markItemSelectedRead,
    onFocusSearch: focusSearch,
    onPagePrev: pagePrev,
    onPageNext: pageNext,
  })

  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-item-id="${list.selectedId}"]`,
    ) as HTMLElement | null
    if (!el) return
    const reduce = prefersReducedMotion()
    el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
    // Roving tabindex: move DOM focus with j/k so AT follows the selection
    el.focus({ preventScroll: true })
  }, [list.selectedId])

  useEffect(() => {
    if (!focusMode || list.items.length === 0) return
    if (list.selectedId != null && list.items.some((i) => i.id === list.selectedId)) return
    const firstUnread = list.items.find((i) => !i.read) ?? list.items[0]
    if (firstUnread) list.setSelectedId(firstUnread.id)
  }, [focusMode, list.items, list.selectedId, list.setSelectedId])

  const selectedItem = list.items.find((i) => i.id === list.selectedId) ?? null

  useEffect(() => {
    if (drawerOpen && !selectedItem) setDrawerOpen(false)
  }, [drawerOpen, selectedItem])

  // Viewing the immersive reader counts as reading — clear the unread badge
  // immediately without a toast (external-open still offers undo).
  const drawerItemId = selectedItem?.id
  const drawerItemRead = selectedItem?.read
  useEffect(() => {
    if (!drawerOpen) {
      return
    }
    if (drawerItemId == null || drawerItemRead) return
    const item = list.items.find((i) => i.id === drawerItemId)
    if (!item || item.read) return
    drawerMarkedId.current = item.id
    actions.markReadOnOpen(item, { silent: true })
  }, [drawerOpen, drawerItemId, drawerItemRead, list.items, actions.markReadOnOpen])

  const runFetch = () => {
    fetchJob.mutate(list.sourceType ? { sourceType: list.sourceType } : undefined, {
      onSuccess: () => list.resetList(),
    })
  }

  const selectedLead = selectedItem
    ? cleanFeedLead(
        selectedItem.summary || selectedItem.scoreReason,
        selectedItem.titleDisplay || selectedItem.title,
      )
    : undefined

  const renderCard = (item: Item, opts?: { focus?: boolean }) => {
    const displayTitle = item.titleDisplay || item.title
    const lead = cleanFeedLead(item.summary || item.scoreReason, displayTitle)
    return (
      <MagCard
        key={item.id}
        dataId={item.id}
        className={opts?.focus ? 'mag-card--focus' : undefined}
        title={displayTitle}
        titleSecondary={
          item.titleDisplay && item.titleDisplay !== item.title ? item.title : undefined
        }
        lead={lead}
        score={item.score}
        tier={scoreTier(item.score)}
        sourceType={item.primarySourceType}
        hideSourceChip={filteredSource}
        tags={item.tags}
        unread={!item.read}
        selected={item.id === list.selectedId}
        dimmed={!opts?.focus && drawerOpen && item.id !== list.selectedId}
        onSelect={() => selectItem(item.id)}
        onOpen={() => openDrawer(item.id)}
        onSwipeSave={() => runWithExit(item, 'save', () => actions.saveItem(item))}
        onSwipeDismiss={() => runWithExit(item, 'dismiss', () => actions.dismissItem(item))}
        exiting={exiting?.id === item.id}
        exitDirection={exiting?.id === item.id ? exiting.dir : undefined}
        meta={
          <>
            <span className="tabular-nums">
              {timeAgo(item.publishedAt ?? item.createdAt, locale)}
            </span>
            {item.stars != null ? (
              <span className="text-faint">
                ★
                {item.stars >= 1000
                  ? `${(item.stars / 1000).toFixed(1)}k`
                  : item.stars}
                {item.starsDelta7d != null && item.starsDelta7d > 0 ? (
                  <span className="text-moss"> +{item.starsDelta7d}</span>
                ) : null}
              </span>
            ) : null}
            {item.saved ? <span className="text-moss">★</span> : null}
          </>
        }
        // Focus mode uses the dedicated control bar below the card — avoid duplicate CTAs.
        actions={
          opts?.focus ? undefined : (
            <>
              <MagAction
                onClick={() => actions.toggleSaved(item)}
                tone="moss"
                title={item.saved ? t('feed.unsave') : t('feed.save')}
              >
                {item.saved ? t('feed.unsave') : t('feed.save')}
              </MagAction>
              <MagAction
                onClick={() => runWithExit(item, 'dismiss', () => actions.dismissItem(item))}
                tone="ember"
                title={t('feed.notInterested')}
              >
                {t('feed.notInterested')}
              </MagAction>
            </>
          )
        }
        secondaryActions={
          opts?.focus ? undefined : (
            <>
              {item.canonicalUrl ? (
                <MagAction
                  href={item.canonicalUrl}
                  onClick={() => actions.markReadOnOpen(item)}
                  tone="accent"
                  title={t('feed.openOriginal')}
                >
                  {t('feed.openOriginal')} ↗
                </MagAction>
              ) : null}
              {!item.read ? (
                <MagAction onClick={() => actions.markItemSelectedRead(item)} title={t('feed.read')}>
                  {t('feed.read')}
                </MagAction>
              ) : null}
            </>
          )
        }
      />
    )
  }

  return (
    <div
      aria-busy={
        isPending ||
        actions.markAll.isPending ||
        list.feedQuery.isFetching ||
        list.searchQuery.isFetching ||
        undefined
      }
    >
      {!hideTitle ? (
        <PageHeader
          titleId="feed-signals-heading"
          title={t('radar.title')}
          subtitle={t('radar.signalsSubtitle')}
          actions={
            <>
              {list.hasSources ? (
                <Button
                  id="feed-fetch-btn"
                  onClick={runFetch}
                  loading={isPending}
                  disabled={isPending}
                  aria-label={phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
                >
                  {phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
                </Button>
              ) : (
                <Link to="/settings/sources" className={buttonVariants()} aria-label={t('feed.addSource')}>
                  {t('feed.addSource')}
                </Link>
              )}
              <Button
                variant="ghost"
                onClick={() => actions.setConfirmMarkAllOpen(true)}
                disabled={actions.markAll.isPending || list.unreadCount === 0}
                loading={actions.markAll.isPending}
                title={list.unreadCount === 0 ? t('feed.markAllReadEmpty') : undefined}
                aria-label={
                  list.unreadCount === 0 ? t('feed.markAllReadEmpty') : t('feed.markAllRead')
                }
              >
                {t('feed.markAllRead')}
              </Button>
            </>
          }
        />
      ) : (
        <div
          className="mb-4 flex flex-wrap justify-end gap-2"
          role="group"
          aria-label={t('radar.title')}
        >
          {list.hasSources ? (
            <Button
              id="feed-fetch-btn"
              onClick={runFetch}
              loading={isPending}
              disabled={isPending}
              aria-label={phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
            >
              {phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
            </Button>
          ) : (
            <Link to="/settings/sources" className={buttonVariants()} aria-label={t('feed.addSource')}>
              {t('feed.addSource')}
            </Link>
          )}
          <Button
            variant="ghost"
            onClick={() => actions.setConfirmMarkAllOpen(true)}
            disabled={actions.markAll.isPending || list.unreadCount === 0}
            loading={actions.markAll.isPending}
            title={list.unreadCount === 0 ? t('feed.markAllReadEmpty') : undefined}
            aria-label={
              list.unreadCount === 0 ? t('feed.markAllReadEmpty') : t('feed.markAllRead')
            }
          >
            {t('feed.markAllRead')}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={actions.confirmMarkAllOpen}
        title={t('feed.markAllReadConfirm')}
        description={
          list.unreadCount > 0
            ? t('feed.markAllReadConfirmHint', { count: list.unreadCount })
            : undefined
        }
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        danger
        pending={actions.markAll.isPending}
        onConfirm={() => {
          actions.markAll.mutate(list.markAllQuery, {
            onSuccess: () => {
              actions.setConfirmMarkAllOpen(false)
              queueMicrotask(() => {
                const heading = document.getElementById('feed-signals-heading')
                if (heading) {
                  heading.focus({ preventScroll: true })
                  return
                }
                document.getElementById('feed-search-input')?.focus()
              })
            },
          })
        }}
        onCancel={() => {
          if (!actions.markAll.isPending) actions.setConfirmMarkAllOpen(false)
        }}
      />

      <FetchProgressSection
        phase={phase}
        progress={progress}
        onDismiss={() => {
          void dismiss()
          queueMicrotask(() => document.getElementById('feed-fetch-btn')?.focus())
        }}
        retrying={retryFailed.isPending}
        onRetryFailed={(types) => retryFailed.mutate(types)}
      />

      {showInboxZero ? (
        <div className="mb-6">
          <InboxZeroBurst>
            <Button
              variant="ghost"
              aria-label={t('fun.inboxZeroDismiss')}
              onClick={() => setShowInboxZero(false)}
            >
              {t('fun.inboxZeroDismiss')}
            </Button>
          </InboxZeroBurst>
        </div>
      ) : null}

      <FeedToolbar
        inputQ={list.inputQ}
        onInputChange={list.setInputQ}
        onClearSearch={list.clearSearch}
        searchMode={list.searchMode}
        q={list.q}
        range={list.range}
        onRangeChange={list.setRange}
        sourceType={list.sourceType}
        onSourceTypeChange={list.onSourceTypeChange}
        unreadOnly={list.unreadOnly}
        onToggleUnreadOnly={() => list.setUnreadOnly((v) => !v)}
        total={list.total}
        unreadCount={list.unreadCount}
        channelTypes={list.channelTypes}
        exploreView={exploreView}
        onExploreViewChange={setView}
      />

      {list.feedQuery.isPending && !list.searchMode ? <ListSkeleton rows={6} /> : null}
      {list.searchMode && list.searchQuery.isLoading ? <ListSkeleton rows={4} /> : null}
      {!list.searchMode && list.feedQuery.isError ? (
        <QueryErrorState
          message={t('common.loadFailed', { message: errorText(list.feedQuery.error, t) })}
          onRetry={() => void list.feedQuery.refetch()}
        />
      ) : null}
      {list.searchMode && list.searchQuery.isError ? (
        <QueryErrorState
          message={t('common.loadFailed', { message: errorText(list.searchQuery.error, t) })}
          onRetry={() => void list.searchQuery.refetch()}
        />
      ) : null}
      {list.items.length === 0 &&
      !list.feedQuery.isPending &&
      !list.searchQuery.isLoading &&
      !list.feedQuery.isError &&
      !(list.searchMode && list.searchQuery.isError) ? (
        <EmptyState
          title={
            list.searchMode
              ? t('feed.noSearchResult')
              : list.hasSources && (list.unreadOnly || !!list.sourceType)
                ? t('feed.filterEmpty')
                : list.hasSources
                  ? t('feed.empty')
                  : t('feed.emptyNoSources')
          }
          description={
            list.searchMode
              ? t('feed.noSearchResultHint')
              : list.hasSources && (list.unreadOnly || !!list.sourceType)
                ? t('feed.filterEmptyHint')
                : list.hasSources
                  ? t('feed.emptyHint')
                  : t('feed.emptyNoSourcesHint')
          }
          primary={
            list.searchMode ? (
              <Button variant="ghost" aria-label={t('feed.clearSearch')} onClick={list.clearSearch}>
                {t('feed.clearSearch')}
              </Button>
            ) : list.hasSources && (list.unreadOnly || !!list.sourceType) ? (
              <Button
                variant="ghost"
                aria-label={t('feed.clearFilters')}
                onClick={() => {
                  list.setUnreadOnly(false)
                  list.onSourceTypeChange('')
                }}
              >
                {t('feed.clearFilters')}
              </Button>
            ) : list.hasSources ? (
              <Button onClick={runFetch} aria-label={t('common.fetchNow')}>
                {t('common.fetchNow')}
              </Button>
            ) : (
              <Link to="/settings/sources" className={buttonVariants()} aria-label={t('feed.addSource')}>
                {t('feed.addSource')}
              </Link>
            )
          }
          secondary={
            list.hasSources && (list.unreadOnly || !!list.sourceType) && !list.searchMode ? (
              <Link
                to="/"
                className={cn(
                  'inline-flex min-h-10 items-center rounded-md border border-border px-3 py-2 text-sm text-accent hover:border-accent/50',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                )}
              >
                {t('decisions.browseToday')}
              </Link>
            ) : null
          }
        />
      ) : null}

      {list.items.length > 0 && focusMode && selectedItem ? (
        <div ref={listRef} className="mx-auto max-w-lg">
          {(() => {
            const idx = list.items.findIndex((i) => i.id === selectedItem.id)
            const current = idx >= 0 ? idx + 1 : 1
            const total = Math.max(list.total, list.items.length)
            return (
              <p
                className="mb-3 text-center font-mono text-[11px] uppercase tracking-widest text-muted"
                aria-live="polite"
              >
                {t('feed.focusProgress', { current, total })}
                {list.hasMore && current >= list.items.length ? (
                  <span className="ml-2 normal-case tracking-normal text-faint">
                    · {t('feed.focusLoadHint')}
                  </span>
                ) : null}
              </p>
            )
          })()}
          <div key={selectedItem.id} className="deck-slide-in motion-reduce:animate-none">
            {renderCard(selectedItem, { focus: true })}
          </div>
          <div
            className="mt-3 flex flex-wrap items-center justify-center gap-1 rounded-xl border border-border bg-surface px-3 py-2"
            role="group"
            aria-label={selectedItem.titleDisplay || selectedItem.title}
          >
            <MagAction onClick={goFocusPrev} title={t('feed.prevItem')}>
              {t('feed.prevItem')}
            </MagAction>
            <MagAction
              onClick={() => openDrawer(selectedItem.id)}
              title={t('feed.expand')}
            >
              {t('feed.expand')}
            </MagAction>
            <MagAction
              onClick={() => actions.toggleSaved(selectedItem)}
              tone="moss"
              title={selectedItem.saved ? t('feed.unsave') : t('feed.save')}
            >
              {selectedItem.saved ? t('feed.unsave') : t('feed.save')}
            </MagAction>
            <MagAction
              onClick={() => {
                const nid = nextItemId(list.items, selectedItem.id)
                runWithExit(selectedItem, 'dismiss', () => {
                  actions.dismissItem(selectedItem)
                  if (nid != null && nid !== selectedItem.id) selectItem(nid)
                })
              }}
              tone="ember"
              title={t('feed.notInterested')}
            >
              {t('feed.notInterested')}
            </MagAction>
            {selectedItem.canonicalUrl ? (
              <MagAction
                href={selectedItem.canonicalUrl}
                onClick={() => actions.markReadOnOpen(selectedItem)}
                tone="accent"
                title={t('feed.openOriginal')}
              >
                {t('feed.openOriginal')} ↗
              </MagAction>
            ) : null}
            <MagAction onClick={goFocusNext} title={t('feed.nextItem')}>
              {t('feed.nextItem')}
            </MagAction>
          </div>
        </div>
      ) : null}

      {list.items.length > 0 && !focusMode ? (
        <div ref={listRef} className="scroll-mt-28 md:scroll-mt-32">
          <MagGrid
            dimmed={drawerOpen}
            variant={filteredSource ? 'list' : 'waterfall'}
            aria-label={t('nav.radar')}
          >
            {list.items.map((item) => renderCard(item))}
          </MagGrid>
        </div>
      ) : null}

      {!list.searchMode && list.hasMore ? (
        <div className="mt-6 flex flex-col items-center gap-3">
          {list.isFetchingNextPage ? (
            <div className="w-full max-w-lg">
              <ListSkeleton rows={2} />
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={() => list.loadMore()}
              aria-label={t('feed.loadMore')}
            >
              {t('feed.loadMore')}
            </Button>
          )}
          <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
        </div>
      ) : null}

      {!list.searchMode &&
      list.items.length > 0 &&
      !list.hasMore &&
      !list.feedQuery.isPending ? (
        <p className="mt-8 text-center text-xs text-faint" aria-live="polite">
          {t('feed.endOfList')}
        </p>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          id="feed-shortcuts-toggle"
          className="inline-flex min-h-9 items-center rounded-sm px-1 text-xs text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg"
          aria-expanded={shortcutsOpen}
          aria-controls="feed-shortcuts-panel"
          onClick={() => setShortcutsOpen((v) => !v)}
        >
          {shortcutsOpen ? t('feed.shortcutsHide') : t('feed.shortcutsShow')}
        </button>
        {shortcutsOpen ? (
          <p
            id="feed-shortcuts-panel"
            role="region"
            aria-label={t('feed.shortcutsShow')}
            className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted"
          >
            <span>
              <kbd aria-hidden>j</kbd>/<kbd aria-hidden>k</kbd> {t('feed.keyMove')}
            </span>
            {focusMode ? (
              <span>
                <kbd aria-hidden>n</kbd>/<kbd aria-hidden>p</kbd> {t('feed.keyFocusNav')}
              </span>
            ) : null}
            <span>
              <kbd aria-hidden>Enter</kbd>/<kbd aria-hidden>o</kbd> {t('feed.keyOpen')}
            </span>
            <span>
              <kbd aria-hidden>u</kbd> {t('feed.keyOriginal')}
            </span>
            <span>
              <kbd aria-hidden>s</kbd> {t('feed.keySave')}
            </span>
            <span>
              <kbd aria-hidden>x</kbd> {t('feed.keyDismiss')}
            </span>
            <span>
              <kbd aria-hidden>m</kbd> {t('feed.keyRead')}
            </span>
            <span>
              <kbd aria-hidden>/</kbd> {t('feed.keySearch')}
            </span>
            <span>
              <kbd aria-hidden>[</kbd>/<kbd aria-hidden>]</kbd> {t('feed.keyPage')}
            </span>
            <span>
              <kbd aria-hidden>⌘K</kbd> {t('nav.search')}
            </span>
          </p>
        ) : null}
      </div>

      <ImmersiveDrawer
        open={drawerOpen && !!selectedItem}
        onClose={closeDrawer}
        title={selectedItem ? selectedItem.titleDisplay || selectedItem.title : undefined}
        titleHref={selectedItem?.canonicalUrl}
        onTitleNavigate={() => selectedItem && actions.markReadOnOpen(selectedItem)}
        subtitle={
          selectedItem ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <SourceBadge type={selectedItem.primarySourceType} />
              <span className="tabular-nums">
                {timeAgo(selectedItem.publishedAt ?? selectedItem.createdAt, locale)}
              </span>
              {selectedItem.score != null ? (
                <span className="font-mono tabular-nums">{Math.round(selectedItem.score)}</span>
              ) : null}
            </div>
          ) : null
        }
        headerAction={
          selectedItem?.canonicalUrl ? (
            <a
              href={selectedItem.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => actions.markReadOnOpen(selectedItem)}
              className="inline-flex min-h-9 items-center rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {t('feed.openOriginal')} ↗
            </a>
          ) : null
        }
        footer={
          selectedItem ? (
            <div
              className="flex flex-wrap items-center gap-1"
              role="group"
              aria-label={selectedItem.titleDisplay || selectedItem.title}
            >
              <MagAction onClick={() => actions.toggleSaved(selectedItem)} tone="moss" title={selectedItem.saved ? t('feed.unsave') : t('feed.save')}>
                {selectedItem.saved ? t('feed.unsave') : t('feed.save')}
              </MagAction>
              {!selectedItem.read ? (
                <MagAction onClick={() => actions.markItemSelectedRead(selectedItem)} title={t('feed.read')}>
                  {t('feed.read')}
                </MagAction>
              ) : null}
              <MagAction
                onClick={() =>
                  runWithExit(selectedItem, 'dismiss', () => {
                    actions.dismissItem(selectedItem)
                    closeDrawer()
                  })
                }
                tone="ember"
                title={t('feed.notInterested')}
              >
                {t('feed.notInterested')}
              </MagAction>
              <MagAction
                href={selectedItem.canonicalUrl}
                onClick={() => actions.markReadOnOpen(selectedItem)}
                tone="accent"
                title={t('feed.openOriginal')}
              >
                {t('feed.openOriginal')} ↗
              </MagAction>
              <span className="ml-auto text-[11px] text-faint" aria-hidden>
                {t('magazine.drawerNavHint')}
              </span>
            </div>
          ) : null
        }
      >
        {selectedItem ? <ItemDetailBody itemId={selectedItem.id} lead={selectedLead} /> : null}
      </ImmersiveDrawer>
    </div>
  )
}
