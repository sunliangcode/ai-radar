import { Chip } from '../../components/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, Focus, ChevronDown } from 'lucide-react'
import { PRIMARY_RANGES, MORE_RANGES, type Range } from './feedQuery'
import type { ExploreView } from '../../lib/engagement'

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
    <div className="mb-4 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
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
            className="h-10 w-full rounded-full border border-border bg-surface px-4 pr-9 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
          {inputQ ? (
            <button
              type="button"
              aria-label={t('feed.clearSearch')}
              onClick={() => {
                onClearSearch()
                document.getElementById('feed-search-input')?.focus()
              }}
              className="absolute right-2.5 top-2 flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-border hover:text-ink"
            >
              ×
            </button>
          ) : (
            <kbd className="absolute right-3 top-2.5">/</kbd>
          )}
        </div>
        <div
          className="flex shrink-0 overflow-hidden rounded-full border border-border"
          role="group"
          aria-label={t('feed.viewToggle')}
        >
          <button
            type="button"
            className={`inline-flex items-center justify-center px-2.5 py-1.5 transition ${
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
            className={`inline-flex items-center justify-center px-2.5 py-1.5 transition ${
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
        <span className="font-mono text-xs text-muted">
          {searchMode ? t('feed.searchingFor', { q }) : t('feed.count', { count: total })}
          {unreadCount > 0 && !unreadOnly ? ` · ${t('feed.unreadInline', { count: unreadCount })}` : ''}
        </span>
      </div>

      <div
        className={`flex gap-1.5 overflow-x-auto pb-0.5 thin-scroll ${searchMode ? 'pointer-events-none opacity-45' : ''}`}
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
        {!showMoreTime ? (
          <button
            type="button"
            disabled={searchMode}
            onClick={() => setShowMoreTime(true)}
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-xs text-muted hover:bg-border hover:text-ink disabled:opacity-40"
          >
            {t('feed.moreTime')}
            <ChevronDown size={12} aria-hidden />
          </button>
        ) : null}
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
