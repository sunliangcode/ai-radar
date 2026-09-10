import { useTranslation } from 'react-i18next'
import { RANGES, type Range } from './feedQuery'

/** Search box + range tabs + source filter + unread toggle + mobile chips. */
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
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
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
        <div
          className={`flex rounded-md border border-border bg-surface p-0.5 ${searchMode ? 'pointer-events-none opacity-45' : ''}`}
          title={searchMode ? t('feed.searchFiltersDisabled') : undefined}
        >
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              disabled={searchMode}
              onClick={() => onRangeChange(r)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${range === r ? 'bg-accent text-white' : 'text-muted hover:text-ink'}`}
            >
              {t(`feed.range.${r}`)}
            </button>
          ))}
        </div>
        <select
          value={sourceType}
          disabled={searchMode}
          title={searchMode ? t('feed.searchFiltersDisabled') : undefined}
          onChange={(e) => onSourceTypeChange(e.target.value)}
          className={`h-9 rounded-md border border-border bg-surface px-2 text-sm ${searchMode ? 'opacity-45' : ''}`}
        >
          <option value="">{t('feed.allSources')}</option>
          {channelTypes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={searchMode}
          title={searchMode ? t('feed.searchFiltersDisabled') : undefined}
          onClick={onToggleUnreadOnly}
          className={`h-9 rounded-md border px-3 text-xs font-medium transition ${
            searchMode ? 'opacity-45' : ''
          } ${unreadOnly ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-muted hover:text-ink'}`}
        >
          {t('feed.unreadOnly')}
        </button>
        <span className="font-mono text-xs text-muted">
          {searchMode ? t('feed.searchingFor', { q }) : t('feed.count', { count: total })}
          {unreadCount > 0 && !unreadOnly ? ` · ${t('feed.unreadInline', { count: unreadCount })}` : ''}
        </span>
      </div>
      {searchMode ? (
        <p className="mb-3 text-xs text-muted">{t('feed.searchFiltersDisabled')}</p>
      ) : null}

      {channelTypes.length > 0 ? (
        <div className="mb-3 flex gap-1.5 overflow-x-auto md:hidden" aria-label={t('nav.sources')}>
          <button
            type="button"
            disabled={searchMode}
            onClick={() => onSourceTypeChange('')}
            className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-mono transition ${
              !sourceType ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-muted'
            } ${searchMode ? 'opacity-45' : ''}`}
          >
            {t('feed.allSources')}
          </button>
          {channelTypes.map((c) => (
            <button
              key={c}
              type="button"
              disabled={searchMode}
              onClick={() => onSourceTypeChange(c)}
              className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-mono transition ${
                sourceType === c ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-muted'
              } ${searchMode ? 'opacity-45' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}
    </>
  )
}
