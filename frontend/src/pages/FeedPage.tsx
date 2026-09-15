import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { errorText } from '../lib/errors'
import {
  Button,
  buttonVariants,
  ConfirmDialog,
  EmptyState,
  ImmersiveDrawer,
  ItemDetailBody,
  ListSkeleton,
  MagAction,
  MagCard,
  MagGrid,
  PageHeader,
  SourceBadge,
  StateBox,
} from '../components/ui'
import { FetchProgressSection } from '../components/fetch/FetchProgressSection'
import { timeAgo } from '../components/magazine/timeAgo'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { dateLocale } from '../i18n'
import { PAGE } from './feed/feedQuery'
import { FeedToolbar } from './feed/FeedToolbar'
import { FeedPagination } from './feed/FeedPagination'
import { useFeedKeyboard } from './feed/useFeedKeyboard'
import { useFeedList } from './feed/useFeedList'
import { useFeedActions } from './feed/useFeedActions'

function scoreTier(score?: number): string | undefined {
  if (score == null) return undefined
  if (score >= 80) return 'HIGH'
  if (score >= 50) return 'MEDIUM'
  return 'LOW'
}

export default function FeedPage() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const listRef = useRef<HTMLDivElement>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const { fetchJob, retryFailed, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['feed'],
    ['sources'],
    ['intelligence-home'],
    ['watching'],
  ])

  const list = useFeedList(!!progress?.running)
  const actions = useFeedActions(list.unreadOnly)

  const focusSearch = useCallback(() => {
    document.getElementById('feed-search-input')?.focus()
  }, [])

  const openDrawer = useCallback((id: number) => {
    list.setSelectedId(id)
    setDrawerOpen(true)
  }, [list.setSelectedId])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  useFeedKeyboard({
    items: list.items,
    selectedId: list.selectedId,
    drawerOpen,
    onSelect: list.setSelectedId,
    onOpenDrawer: openDrawer,
    onCloseDrawer: closeDrawer,
    onOpenExternal: actions.openExternalAndMarkRead,
    onToggleSaved: actions.toggleSaved,
    onMarkRead: actions.markItemSelectedRead,
    onFocusSearch: focusSearch,
  })

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-item-id="${list.selectedId}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [list.selectedId])

  const selectedItem = list.items.find((i) => i.id === list.selectedId) ?? null

  useEffect(() => {
    if (drawerOpen && !selectedItem) setDrawerOpen(false)
  }, [drawerOpen, selectedItem])

  const runFetch = () => {
    fetchJob.mutate(list.sourceType ? { sourceType: list.sourceType } : undefined, {
      onSuccess: () => list.resetList(),
    })
  }

  return (
    <div>
      <PageHeader
        title={t('feed.title')}
        subtitle={t('feed.subtitle')}
        actions={
          <>
            {list.hasSources ? (
              <Button onClick={runFetch} loading={isPending}>
                {phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
              </Button>
            ) : (
              <Link to="/settings/sources" className={buttonVariants()}>
                {t('feed.addSource')}
              </Link>
            )}
            <Button
              variant="ghost"
              onClick={() => actions.setConfirmMarkAllOpen(true)}
              disabled={actions.markAll.isPending}
            >
              {t('feed.markAllRead')}
            </Button>
          </>
        }
      />

      <ConfirmDialog
        open={actions.confirmMarkAllOpen}
        title={t('feed.markAllReadConfirm')}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        pending={actions.markAll.isPending}
        onConfirm={() => {
          actions.setConfirmMarkAllOpen(false)
          actions.markAll.mutate()
        }}
        onCancel={() => actions.setConfirmMarkAllOpen(false)}
      />

      <FetchProgressSection
        phase={phase}
        progress={progress}
        onDismiss={() => void dismiss()}
        retrying={retryFailed.isPending}
        onRetryFailed={(types) => retryFailed.mutate(types)}
      />

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
      />

      {list.feedQuery.isLoading && !list.searchMode ? <ListSkeleton rows={6} /> : null}
      {list.searchMode && list.searchQuery.isLoading ? <ListSkeleton rows={4} /> : null}
      {!list.searchMode && list.feedQuery.isError ? (
        <StateBox>
          <p className="mb-3">
            {t('common.loadFailed', { message: errorText(list.feedQuery.error, t) })}
          </p>
          <Button variant="ghost" onClick={() => void list.feedQuery.refetch()}>
            {t('common.retry')}
          </Button>
        </StateBox>
      ) : null}
      {list.searchMode && list.searchQuery.isError ? (
        <StateBox>
          <p className="mb-3">
            {t('common.loadFailed', { message: errorText(list.searchQuery.error, t) })}
          </p>
          <Button variant="ghost" onClick={() => void list.searchQuery.refetch()}>
            {t('common.retry')}
          </Button>
        </StateBox>
      ) : null}
      {list.items.length === 0 &&
      !list.feedQuery.isLoading &&
      !list.searchQuery.isLoading &&
      !list.feedQuery.isError &&
      !(list.searchMode && list.searchQuery.isError) ? (
        <EmptyState
          title={
            list.searchMode
              ? t('feed.noSearchResult')
              : list.hasSources
                ? t('feed.empty')
                : t('feed.emptyNoSources')
          }
          description={
            list.searchMode
              ? t('feed.noSearchResultHint')
              : list.hasSources
                ? t('feed.emptyHint')
                : t('feed.emptyNoSourcesHint')
          }
          primary={
            list.searchMode ? undefined : list.hasSources ? (
              <Button onClick={runFetch}>{t('common.fetchNow')}</Button>
            ) : (
              <Link to="/settings/sources" className={buttonVariants()}>
                {t('feed.addSource')}
              </Link>
            )
          }
        />
      ) : null}

      {list.items.length > 0 ? (
        <div ref={listRef}>
          <MagGrid dimmed={drawerOpen}>
            {list.items.map((item) => {
              const lead = item.summary || item.scoreReason || undefined
              return (
                <MagCard
                  key={item.id}
                  dataId={item.id}
                  title={item.titleDisplay || item.title}
                  titleSecondary={
                    item.titleDisplay && item.titleDisplay !== item.title ? item.title : undefined
                  }
                  lead={lead}
                  score={item.score}
                  tier={scoreTier(item.score)}
                  sourceType={item.primarySourceType}
                  tags={item.tags}
                  unread={!item.read}
                  selected={item.id === list.selectedId}
                  dimmed={drawerOpen && item.id !== list.selectedId}
                  href={item.canonicalUrl}
                  onSelect={() => list.setSelectedId(item.id)}
                  onOpen={() => actions.markReadOnOpen(item)}
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
                  actions={
                    <>
                      <MagAction onClick={() => actions.toggleSaved(item)} tone="moss">
                        {item.saved ? t('feed.unsave') : t('feed.save')}
                      </MagAction>
                      <MagAction onClick={() => actions.dismissItem(item)} tone="ember">
                        {t('feed.notInterested')}
                      </MagAction>
                    </>
                  }
                  secondaryActions={
                    <>
                      <MagAction
                        onClick={() => {
                          list.setSelectedId(item.id)
                          openDrawer(item.id)
                        }}
                      >
                        {t('feed.expand')}
                      </MagAction>
                      {!item.read ? (
                        <MagAction onClick={() => actions.markItemSelectedRead(item)}>
                          {t('feed.read')}
                        </MagAction>
                      ) : null}
                    </>
                  }
                />
              )
            })}
          </MagGrid>
        </div>
      ) : null}

      {!list.searchMode ? (
        <FeedPagination page={list.page} total={list.total} pageSize={PAGE} onChange={list.changePage} />
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          className="text-xs text-muted hover:text-ink"
          aria-expanded={shortcutsOpen}
          onClick={() => setShortcutsOpen((v) => !v)}
        >
          {shortcutsOpen ? t('feed.shortcutsHide') : t('feed.shortcutsShow')}
        </button>
        {shortcutsOpen ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>
              <kbd>j</kbd>/<kbd>k</kbd> {t('feed.keyMove')}
            </span>
            <span>
              <kbd>Enter</kbd> {t('feed.keyOpen')}
            </span>
            <span>
              <kbd>o</kbd> {t('feed.keyExpand')}
            </span>
            <span>
              <kbd>s</kbd> {t('feed.keySave')}
            </span>
            <span>
              <kbd>m</kbd> {t('feed.keyRead')}
            </span>
            <span>
              <kbd>/</kbd> {t('feed.keySearch')}
            </span>
            <span>
              <kbd>⌘K</kbd> {t('nav.search')}
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
              className="inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
            >
              {t('feed.openOriginal')} ↗
            </a>
          ) : null
        }
        footer={
          selectedItem ? (
            <div className="flex flex-wrap items-center gap-1">
              <MagAction onClick={() => actions.toggleSaved(selectedItem)} tone="moss">
                {selectedItem.saved ? t('feed.unsave') : t('feed.save')}
              </MagAction>
              {!selectedItem.read ? (
                <MagAction onClick={() => actions.markItemSelectedRead(selectedItem)}>
                  {t('feed.read')}
                </MagAction>
              ) : null}
              <MagAction onClick={() => actions.dismissItem(selectedItem)} tone="ember">
                {t('feed.notInterested')}
              </MagAction>
              <MagAction
                href={selectedItem.canonicalUrl}
                onClick={() => actions.markReadOnOpen(selectedItem)}
                tone="accent"
              >
                {t('feed.openOriginal')} ↗
              </MagAction>
              <span className="ml-auto text-[11px] text-faint">{t('magazine.drawerNavHint')}</span>
            </div>
          ) : null
        }
      >
        {selectedItem ? <ItemDetailBody itemId={selectedItem.id} lead={selectedItem.summary} /> : null}
      </ImmersiveDrawer>
    </div>
  )
}
