import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  loadDisplaySourceIds,
  normalizeDisplaySourceIds,
  saveDisplaySourceIds,
  displaySourceIdsQuery,
  isSourceDisplayed,
  isDisplaySourceInitialized,
  markDisplaySourceInitialized,
  prefersDomesticBrowse,
  domesticSourceIds,
  foreignSourceIds,
  loadSourceRegionMode,
  saveSourceRegionMode,
  type SourceRegionMode,
} from '../lib/displaySources'
import { useSources } from './useSources'

type DisplaySourcesApi = {
  /** `null` = all enabled sources visible; `[]` = none. */
  displaySourceIds: number[] | null
  regionMode: SourceRegionMode
  isRestricted: boolean
  selectedCount: number
  enabledCount: number
  allSelected: boolean
  noneSelected: boolean
  sourceIdsQuery: string
  isDisplayed: (sourceId: number) => boolean
  setAllDisplayed: () => void
  setNoneDisplayed: () => void
  /** Restrict display to these ids (normalized against enabled). */
  setDisplayedIds: (ids: number[]) => void
  setRegionMode: (mode: SourceRegionMode) => void
  toggleDisplayed: (sourceId: number, displayed: boolean) => void
}

const DisplaySourcesContext = createContext<DisplaySourcesApi | null>(null)

export function DisplaySourcesProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const sources = useSources()
  const enabled = useMemo(
    () => (sources.data ?? []).filter((s) => s.enabled),
    [sources.data],
  )
  const enabledIds = useMemo(() => enabled.map((s) => s.id), [enabled])

  const [rawIds, setRawIds] = useState<number[] | null>(() => loadDisplaySourceIds())
  const [regionMode, setRegionModeState] = useState<SourceRegionMode>(() => loadSourceRegionMode())

  const displaySourceIds = useMemo(
    () => normalizeDisplaySourceIds(rawIds, enabledIds),
    [rawIds, enabledIds],
  )

  const persist = useCallback(
    (next: number[] | null, mode?: SourceRegionMode) => {
      const normalized = normalizeDisplaySourceIds(next, enabledIds)
      setRawIds(normalized)
      saveDisplaySourceIds(normalized)
      markDisplaySourceInitialized()
      if (mode) {
        setRegionModeState(mode)
        saveSourceRegionMode(mode)
      } else if (normalized === null) {
        setRegionModeState('all')
        saveSourceRegionMode('all')
      }
    },
    [enabledIds],
  )

  /** First visit + zh locale → auto「国内模式」so daily browse is CN without setup. */
  useEffect(() => {
    if (!enabled.length) return
    if (isDisplaySourceInitialized()) return
    markDisplaySourceInitialized()
    if (!prefersDomesticBrowse(i18n.language)) return
    const ids = domesticSourceIds(enabled)
    if (ids.length > 0 && ids.length < enabled.length) {
      persist(ids, 'domestic')
    }
  }, [enabled, enabled.length, i18n.language, persist])

  const setAllDisplayed = useCallback(() => persist(null, 'all'), [persist])
  const setNoneDisplayed = useCallback(() => persist([]), [persist])
  const setDisplayedIds = useCallback((ids: number[]) => persist(ids), [persist])

  const setRegionMode = useCallback(
    (mode: SourceRegionMode) => {
      if (mode === 'all') {
        persist(null, 'all')
        return
      }
      if (mode === 'domestic') {
        persist(domesticSourceIds(enabled), 'domestic')
        return
      }
      persist(foreignSourceIds(enabled), 'foreign')
    },
    [enabled, persist],
  )

  const toggleDisplayed = useCallback(
    (sourceId: number, displayed: boolean) => {
      const base =
        displaySourceIds ??
        enabledIds.slice().sort((a, b) => a - b)
      let next: number[]
      if (displayed) {
        next = [...new Set([...base, sourceId])].sort((a, b) => a - b)
      } else {
        next = base.filter((id) => id !== sourceId)
      }
      if (next.length === enabledIds.length) {
        persist(null, 'all')
      } else {
        persist(next)
      }
    },
    [displaySourceIds, enabledIds, persist],
  )

  const selectedCount =
    displaySourceIds === null ? enabledIds.length : displaySourceIds.length
  const allSelected = displaySourceIds === null && enabledIds.length > 0
  const noneSelected = displaySourceIds !== null && displaySourceIds.length === 0

  const value = useMemo<DisplaySourcesApi>(
    () => ({
      displaySourceIds,
      regionMode,
      isRestricted: displaySourceIds !== null,
      selectedCount,
      enabledCount: enabledIds.length,
      allSelected,
      noneSelected,
      sourceIdsQuery: displaySourceIdsQuery(displaySourceIds),
      isDisplayed: (id) => isSourceDisplayed(id, displaySourceIds),
      setAllDisplayed,
      setNoneDisplayed,
      setDisplayedIds,
      setRegionMode,
      toggleDisplayed,
    }),
    [
      displaySourceIds,
      regionMode,
      selectedCount,
      enabledIds.length,
      allSelected,
      noneSelected,
      setAllDisplayed,
      setNoneDisplayed,
      setDisplayedIds,
      setRegionMode,
      toggleDisplayed,
    ],
  )

  return (
    <DisplaySourcesContext.Provider value={value}>{children}</DisplaySourcesContext.Provider>
  )
}

export function useDisplaySources(): DisplaySourcesApi {
  const ctx = useContext(DisplaySourcesContext)
  if (!ctx) {
    throw new Error('useDisplaySources must be used within DisplaySourcesProvider')
  }
  return ctx
}
