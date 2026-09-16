import { Chip } from '../../components/ui'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, Focus } from 'lucide-react'
import { RANGES, type Range } from './feedQuery'
import type { ExploreView } from '../../lib/engagement'

/** Search + one scrollable chip row (range / unread / source) + view toggle. */
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
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs transition ${
              exploreView === 'waterfall'
                ? 'bg-accent-soft font-medium text-accent'
                : 'text-muted hover:bg-border hover:text-ink'
            }`}
            aria-pressed={exploreView === 'waterfall'}
            onClick={() => onExploreViewChange('waterfall')}
          >
            <LayoutGrid size={12} aria-hidden />
            {t('feed.viewWaterfall')}
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs transition ${
              exploreView === 'focus'
                ? 'bg-accent-soft font-medium text-accent'
                : 'text-muted hover:bg-border hover:text-ink'
            }`}
            aria-pressed={exploreView === 'focus'}
            onClick={() => onExploreViewChange('focus')}
          >
            <Focus size={12} aria-hidden />
            {t('feed.viewFocus')}
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
        {RANGES.map((r) => (
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
