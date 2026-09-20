import { Chip } from '../../components/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, Focus, ChevronDown } from 'lucide-react'
import { PRIMARY_RANGES, MORE_RANGES, type Range } from './feedQuery'
import type { ExploreView } from '../../lib/engagement'
import { focusRingClass } from '../../lib/cn'

/** Search + light filters: time, unread, sources (CN-first). Low chrome for daily browse. */
export function FeedToolbar({
  inputQ,
  onInputChange,
  onClearSearch,
  searchMode,
  q,
  range,
  onRangeChange,
  sourceType,
  onSourceTypeChange,
  unreadOnly,
  onToggleUnreadOnly,
  total,
  unreadCount,
  channelTypes,
  exploreView,
  onExploreViewChange,
}: {
  inputQ: string
  onInputChange: (v: string) => void
  onClearSearch: () => void
  searchMode: boolean
  q: string
  range: Range
  onRangeChange: (r: Range) => void
  sourceType: string
  onSourceTypeChange: (v: string) => void
  unreadOnly: boolean
  onToggleUnreadOnly: () => void
  total: number
  unreadCount: number
  channelTypes: string[]
  exploreView: ExploreView
  onExploreViewChange: (v: ExploreView) => void
}) {
  const { t } = useTranslation()
  const [showMoreTime, setShowMoreTime] = useState(
    () => MORE_RANGES.includes(range as (typeof MORE_RANGES)[number]),
  )
  const timeRanges = showMoreTime ? [...PRIMARY_RANGES, ...MORE_RANGES] : PRIMARY_RANGES

  return (
    <div
      role="toolbar"
      aria-label={t('feed.toolbarLabel')}
      className="sticky top-12 z-[9] mb-4 space-y-2.5 bg-bg/95 py-2 backdrop-blur-sm motion-reduce:backdrop-blur-none supports-[backdrop-filter]:bg-bg/80 motion-reduce:supports-[backdrop-filter]:bg-bg md:top-14 pt-[max(0px,env(safe-area-inset-top))]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1" role="search">
          <input
            id="feed-search-input"
            value={inputQ}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onClearSearch()
              }
            }}
            placeholder={t('feed.searchPlaceholder')}
            aria-label={t('feed.searchPlaceholder')}
            className="h-10 w-full rounded-full border border-border bg-surface px-4 pr-11 text-sm outline-none transition motion-reduce:transition-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/15"
          />
          {inputQ ? (
            <button
              type="button"
              aria-label={t('feed.clearSearch')}
              onClick={() => {
                onClearSearch()
                document.getElementById('feed-search-input')?.focus()
              }}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-border hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <span aria-hidden>×</span>
            </button>
          ) : (
            <kbd className="absolute right-3 top-2.5" aria-hidden>
              /
            </kbd>
          )}
        </div>
        <div
          className="flex shrink-0 overflow-hidden rounded-full border border-border"
          role="group"
          aria-label={t('feed.viewToggle')}
        >
          <button
            type="button"
            className={`inline-flex min-h-9 min-w-9 items-center justify-center px-2.5 py-1.5 transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40 ${
              exploreView === 'waterfall'
                ? 'bg-accent-soft text-accent'
                : 'text-muted hover:bg-border hover:text-ink'
            }`}
            aria-pressed={exploreView === 'waterfall'}
            aria-label={t('feed.viewWaterfall')}
            title={t('feed.viewWaterfall')}
            onClick={() => onExploreViewChange('waterfall')}
          >
            <LayoutGrid size={14} aria-hidden />
          </button>
          <button
            type="button"
            className={`inline-flex min-h-9 min-w-9 items-center justify-center px-2.5 py-1.5 transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40 ${
              exploreView === 'focus'
                ? 'bg-accent-soft text-accent'
                : 'text-muted hover:bg-border hover:text-ink'
            }`}
            aria-pressed={exploreView === 'focus'}
            aria-label={t('feed.viewFocus')}
            title={t('feed.viewFocus')}
            onClick={() => onExploreViewChange('focus')}
          >
            <Focus size={14} aria-hidden />
          </button>
        </div>
        <span className="font-mono text-xs text-muted" aria-live="polite">
          {searchMode ? t('feed.searchingFor', { q }) : t('feed.count', { count: total })}
          {unreadCount > 0 && !unreadOnly ? ` · ${t('feed.unreadInline', { count: unreadCount })}` : ''}
        </span>
      </div>

      <div
        className={`flex gap-1.5 overflow-x-auto pb-0.5 thin-scroll ${searchMode ? 'pointer-events-none opacity-45' : ''}`}
        role="group"
        aria-label={t('feed.filtersLabel')}
        aria-disabled={searchMode || undefined}
        title={searchMode ? t('feed.searchFiltersDisabled') : undefined}
      >
        {timeRanges.map((r) => (
          <Chip
            key={r}
            shape="pill"
            active={range === r}
            disabled={searchMode}
            onClick={() => onRangeChange(r)}
            className="shrink-0"
          >
            {t(`feed.range.${r}`)}
          </Chip>
        ))}
        <button
          type="button"
          disabled={searchMode}
          onClick={() => setShowMoreTime((v) => !v)}
          aria-expanded={showMoreTime}
          className={`inline-flex min-h-9 shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-xs text-muted hover:bg-border hover:text-ink disabled:opacity-40 ${focusRingClass()}`}
        >
          {showMoreTime ? t('feed.lessTime') : t('feed.moreTime')}
          <ChevronDown
            size={12}
            aria-hidden
            className={showMoreTime ? 'rotate-180 transition motion-reduce:transition-none' : 'transition motion-reduce:transition-none'}
          />
        </button>
        <Chip
          shape="pill"
          active={unreadOnly}
          disabled={searchMode}
          onClick={onToggleUnreadOnly}
          className="shrink-0"
        >
          {t('feed.unreadOnly')}
        </Chip>
        <span className="mx-0.5 h-6 w-px shrink-0 self-center bg-border" aria-hidden />
        <Chip
          shape="pill"
          active={!sourceType}
          disabled={searchMode}
          onClick={() => onSourceTypeChange('')}
          className="shrink-0"
        >
          {t('feed.allSources')}
        </Chip>
        {channelTypes.map((c) => (
          <Chip
            key={c}
            shape="pill"
            active={sourceType === c}
            disabled={searchMode}
            onClick={() => onSourceTypeChange(c)}
            className="shrink-0"
          >
            {t(`sourceType.${c}`, { defaultValue: c })}
          </Chip>
        ))}
      </div>

      {searchMode ? (
        <p className="text-xs text-muted">{t('feed.searchFiltersDisabled')}</p>
      ) : null}
    </div>
  )
}
