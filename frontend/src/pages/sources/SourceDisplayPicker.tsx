import { useTranslation } from 'react-i18next'
import type { Source } from '../../lib/api'
import { useDisplaySources } from '../../hooks/useDisplaySources'

export function SourceDisplayPicker({ sources }: { sources: Source[] }) {
  const { t } = useTranslation()
  const {
    displaySourceIds,
    isRestricted,
    selectedCount,
    enabledCount,
    allSelected,
    noneSelected,
    setAllDisplayed,
    setNoneDisplayed,
    toggleDisplayed,
    isDisplayed,
  } = useDisplaySources()

  const enabled = sources.filter((s) => s.enabled)
  if (enabled.length === 0) return null

  const masterChecked = allSelected
  const masterIndeterminate = isRestricted && !noneSelected && !allSelected

  return (
    <section className="mb-6 rounded-xl border border-border bg-surface/70 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium text-ink">{t('sources.displayTitle')}</h2>
          <p className="mt-1 max-w-xl text-xs text-muted">{t('sources.displayHint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-2.5 py-1 text-xs text-ink transition hover:border-accent/40 hover:text-accent disabled:opacity-40"
            disabled={allSelected}
            onClick={setAllDisplayed}
          >
            {t('sources.displaySelectAll')}
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-2.5 py-1 text-xs text-ink transition hover:border-accent/40 hover:text-accent disabled:opacity-40"
            disabled={noneSelected}
            onClick={setNoneDisplayed}
          >
            {t('sources.displaySelectNone')}
          </button>
        </div>
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2.5 rounded-md border border-border/70 bg-bg/50 px-2.5 py-2 hover:bg-border/30">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
          checked={masterChecked}
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

      <ul className="mt-2 flex flex-col gap-0.5">
        {enabled.map((s) => {
          const checked = isDisplayed(s.id)
          return (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 hover:bg-border/40">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
                  checked={checked}
                  onChange={(e) => toggleDisplayed(s.id, e.target.checked)}
                />
                <span className="min-w-0 flex-1 text-sm text-ink">{s.name}</span>
                <span className="font-mono text-[10px] text-muted">{s.type}</span>
              </label>
            </li>
          )
        })}
      </ul>
      {isRestricted ? (
        <p className="mt-3 text-xs text-moss">
          {noneSelected
            ? t('sources.displayNoneActive')
            : t('sources.displayActive', { count: displaySourceIds?.length ?? 0 })}
        </p>
      ) : null}
    </section>
  )
}
