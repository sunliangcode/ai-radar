import { Chip } from '../../components/ui'
import { useTranslation } from 'react-i18next'
import { RANGES, type Range } from './feedQuery'

/** Search box + discovery chips (range / unread / source) + mobile source strip. */
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
}) {
  const { t } = useTranslation()

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
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
            className="h-9 w-full rounded-md border border-border bg-surface px-3 pr-8 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
          {inputQ ? (
            <button
              type="button"
              aria-label={t('feed.clearSearch')}
              onClick={() => {
                onClearSearch()
                document.getElementById('feed-search-input')?.focus()
              }}
              className="absolute right-2 top-1.5 flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-border hover:text-ink"
            >
              ×
            </button>
          ) : (
            <kbd className="absolute right-2 top-2">/</kbd>
          )}
        </div>
        <span className="font-mono text-xs text-muted">
          {searchMode ? t('feed.searchingFor', { q }) : t('feed.count', { count: total })}
          {unreadCount > 0 && !unreadOnly ? ` · ${t('feed.unreadInline', { count: unreadCount })}` : ''}
        </span>
      </div>

      <div
        className={`mb-3 flex flex-wrap items-center gap-1.5 ${searchMode ? 'pointer-events-none opacity-45' : ''}`}
        title={searchMode ? t('feed.searchFiltersDisabled') : undefined}
      >
        {RANGES.map((r) => (
          <Chip
            key={r}
            shape="pill"
            active={range === r}
            disabled={searchMode}
            onClick={() => onRangeChange(r)}
          >
            {t(`feed.range.${r}`)}
          </Chip>
        ))}
        <Chip
          shape="pill"
          active={unreadOnly}
          disabled={searchMode}
          onClick={onToggleUnreadOnly}
        >
          {t('feed.unreadOnly')}
        </Chip>
        <select
          value={sourceType}
          disabled={searchMode}
          title={searchMode ? t('feed.searchFiltersDisabled') : undefined}
          onChange={(e) => onSourceTypeChange(e.target.value)}
          className={`ml-1 h-8 rounded-full border border-border bg-surface px-2.5 text-xs ${searchMode ? 'opacity-45' : ''}`}
        >
          <option value="">{t('feed.allSources')}</option>
          {channelTypes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {searchMode ? (
        <p className="mb-3 text-xs text-muted">{t('feed.searchFiltersDisabled')}</p>
      ) : null}

      {channelTypes.length > 0 ? (
        <div className="mb-3 flex gap-1.5 overflow-x-auto md:hidden" aria-label={t('nav.sources')}>
          <Chip
            shape="pill"
            active={!sourceType}
            disabled={searchMode}
            onClick={() => onSourceTypeChange('')}
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
              className="font-mono"
            >
              {c}
            </Chip>
          ))}
        </div>
      ) : null}
    </>
  )
}
