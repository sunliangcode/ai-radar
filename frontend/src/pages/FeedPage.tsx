import { useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { errorText } from '../lib/errors'
import {
  Button,
  buttonVariants,
  ConfirmDialog,
  EmptyState,
  ListSkeleton,
  PageHeader,
  StateBox,
} from '../components/ui'
import { FeedRow } from '../components/FeedRow'
import { FetchProgressSection } from '../components/fetch/FetchProgressSection'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { dateLocale } from '../i18n'
import { PAGE } from './feed/feedQuery'
import { FeedToolbar } from './feed/FeedToolbar'
import { FeedPagination } from './feed/FeedPagination'
import { useFeedKeyboard } from './feed/useFeedKeyboard'
import { useFeedList } from './feed/useFeedList'
import { useFeedActions } from './feed/useFeedActions'

export default function FeedPage() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const listRef = useRef<HTMLDivElement>(null)

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

  useFeedKeyboard({
    items: list.items,
    selectedId: list.selectedId,
    onSelect: list.setSelectedId,
    onExpand: actions.expandItem,
    onOpen: actions.openExternalAndMarkRead,
    onToggleSaved: actions.toggleSaved,
    onMarkRead: actions.markItemSelectedRead,
    onFocusSearch: focusSearch,
  })

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-item-id="${list.selectedId}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [list.selectedId])

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
          {list.items.map((item) => (
            <div key={item.id} className="group">
              <FeedRow
                item={item}
                selected={item.id === list.selectedId}
                onSelect={() => list.setSelectedId(item.id)}
                locale={locale}
                onToggleSaved={() => actions.toggleSaved(item)}
                onMarkRead={() => actions.markItemSelectedRead(item)}
                onNotInterested={() => actions.dismissItem(item)}
                onOpenExternal={() => actions.markReadOnOpen(item)}
                expandSignal={actions.expandSignals[item.id]}
              />
            </div>
          ))}
        </div>
      ) : null}

      {!list.searchMode ? (
        <FeedPagination page={list.page} total={list.total} pageSize={PAGE} onChange={list.changePage} />
      ) : null}

      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>{t('feed.shortcuts')}</span>
        <span>
          <kbd>j</kbd>/<kbd>k</kbd> {t('feed.keyMove')}
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
    </div>
  )
}
