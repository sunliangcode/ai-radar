import { useTranslation } from 'react-i18next'
import type { Source } from '../../lib/api'
import { useDisplaySources } from '../../hooks/useDisplaySources'
import {
  DOMESTIC_SOURCE_TYPES,
  FOREIGN_SOURCE_TYPES,
  type SourceRegionMode,
} from '../../lib/displaySources'
import { groupSourcesByCategory } from '../../lib/sourceCategories'
import { SourceBadge } from '../../components/primitives/Badge'

function modeButtonClass(active: boolean): string {
  return active
    ? 'min-h-9 rounded-md border border-accent/50 bg-accent/10 px-2.5 py-1.5 text-xs text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'
    : 'min-h-9 rounded-md border border-border px-2.5 py-1.5 text-xs text-ink transition motion-reduce:transition-none hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40'
}

export function SourceDisplayPicker({ sources }: { sources: Source[] }) {
  const { t } = useTranslation()
  const {
    displaySourceIds,
    regionMode,
    isRestricted,
    selectedCount,
    enabledCount,
    allSelected,
    noneSelected,
    setRegionMode,
    setAllDisplayed,
    setNoneDisplayed,
    toggleDisplayed,
    isDisplayed,
  } = useDisplaySources()

  const enabled = sources.filter((s) => s.enabled)
  if (enabled.length === 0) return null

  const groups = groupSourcesByCategory(enabled)
  const domesticIds = enabled
    .filter((s) => DOMESTIC_SOURCE_TYPES.has((s.type ?? '').toUpperCase()))
    .map((s) => s.id)
  const foreignIds = enabled
    .filter((s) => FOREIGN_SOURCE_TYPES.has((s.type ?? '').toUpperCase()))
    .map((s) => s.id)

  const masterChecked = allSelected
  const masterIndeterminate = isRestricted && !noneSelected && !allSelected

  function applyMode(mode: SourceRegionMode) {
    setRegionMode(mode)
  }

  return (
    <section
      className="mb-6 rounded-xl border border-border bg-surface/70 px-4 py-4"
      aria-labelledby="sources-display-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="sources-display-heading" className="text-sm font-medium text-ink">
            {t('sources.displayTitle')}
          </h2>
          <p className="mt-1 max-w-xl text-xs text-muted">{t('sources.displayHint')}</p>
        </div>
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t('sources.regionModes')}
        >
          <button
            type="button"
            className={modeButtonClass(regionMode === 'domestic')}
            disabled={domesticIds.length === 0}
            title={domesticIds.length === 0 ? t('sources.regionDomesticEmpty') : undefined}
            aria-pressed={regionMode === 'domestic'}
            onClick={() => applyMode('domestic')}
          >
            {t('sources.regionDomestic')}
          </button>
          <button
            type="button"
            className={modeButtonClass(regionMode === 'foreign')}
            disabled={foreignIds.length === 0}
            title={foreignIds.length === 0 ? t('sources.regionForeignEmpty') : undefined}
            aria-pressed={regionMode === 'foreign'}
            onClick={() => applyMode('foreign')}
          >
            {t('sources.regionForeign')}
          </button>
          <button
            type="button"
            className={modeButtonClass(regionMode === 'all')}
            disabled={allSelected && regionMode === 'all'}
            aria-pressed={regionMode === 'all'}
            onClick={() => applyMode('all')}
          >
            {t('sources.regionAll')}
          </button>
          <button
            type="button"
            className="min-h-9 rounded-md border border-border px-2.5 py-1.5 text-xs text-ink transition motion-reduce:transition-none hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40"
            disabled={noneSelected}
            aria-label={t('sources.displaySelectNone')}
            onClick={setNoneDisplayed}
          >
            {t('sources.displaySelectNone')}
          </button>
        </div>
      </div>

      <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-border/70 bg-bg/50 px-2.5 py-2 hover:bg-border/30">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-accent focus-visible:ring-2 focus-visible:ring-accent/40"
          checked={masterChecked}
          aria-checked={masterIndeterminate ? 'mixed' : masterChecked}
          ref={(el) => {
            if (el) el.indeterminate = masterIndeterminate
          }}
          onChange={(e) => {
            if (e.target.checked) setAllDisplayed()
            else setNoneDisplayed()
          }}
        />
        <span className="flex-1 text-sm font-medium text-ink">{t('sources.displayMaster')}</span>
        <span className="font-mono text-[10px] tabular-nums text-muted">
          {t('sources.displayCount', { selected: selectedCount, total: enabledCount })}
        </span>
      </label>

      <div className="mt-3 space-y-3">
        {groups.map((group) => (
          <div key={group.id}>
            <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              {t(`sources.category.${group.id}`)}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.sources.map((s) => {
                const checked = isDisplayed(s.id)
                return (
                  <li key={s.id}>
                    <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 hover:bg-border/40">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                        checked={checked}
                        onChange={(e) => toggleDisplayed(s.id, e.target.checked)}
                      />
                      <span className="min-w-0 flex-1 text-sm text-ink">{s.name}</span>
                      <SourceBadge type={s.type} />
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      {isRestricted ? (
        <p className="mt-3 text-xs text-moss" role="status">
          {noneSelected
            ? t('sources.displayNoneActive')
            : t('sources.displayActive', { count: displaySourceIds?.length ?? 0 })}
        </p>
      ) : null}
    </section>
  )
}
