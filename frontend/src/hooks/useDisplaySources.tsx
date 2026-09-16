import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  loadDisplaySourceIds,
  normalizeDisplaySourceIds,
  saveDisplaySourceIds,
  displaySourceIdsQuery,
  isSourceDisplayed,
} from '../lib/displaySources'
import { useSources } from './useSources'

type DisplaySourcesApi = {
  /** `null` = all enabled sources visible; `[]` = none. */
  displaySourceIds: number[] | null
  isRestricted: boolean
  selectedCount: number
  enabledCount: number
  allSelected: boolean
  noneSelected: boolean
  sourceIdsQuery: string
  isDisplayed: (sourceId: number) => boolean
  setAllDisplayed: () => void
  setNoneDisplayed: () => void
  toggleDisplayed: (sourceId: number, displayed: boolean) => void
}

const DisplaySourcesContext = createContext<DisplaySourcesApi | null>(null)

export function DisplaySourcesProvider({ children }: { children: ReactNode }) {
  const sources = useSources()
  const enabledIds = useMemo(
    () => (sources.data ?? []).filter((s) => s.enabled).map((s) => s.id),
    [sources.data],
  )

  const [rawIds, setRawIds] = useState<number[] | null>(() => loadDisplaySourceIds())

  const displaySourceIds = useMemo(
    () => normalizeDisplaySourceIds(rawIds, enabledIds),
    [rawIds, enabledIds],
  )

  const persist = useCallback(
    (next: number[] | null) => {
      const normalized = normalizeDisplaySourceIds(next, enabledIds)
      setRawIds(normalized)
      saveDisplaySourceIds(normalized)
    },
    [enabledIds],
  )

  const setAllDisplayed = useCallback(() => persist(null), [persist])
  const setNoneDisplayed = useCallback(() => persist([]), [persist])

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
        persist(null)
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
      isRestricted: displaySourceIds !== null,
      selectedCount,
      enabledCount: enabledIds.length,
      allSelected,
      noneSelected,
      sourceIdsQuery: displaySourceIdsQuery(displaySourceIds),
      isDisplayed: (id) => isSourceDisplayed(id, displaySourceIds),
      setAllDisplayed,
      setNoneDisplayed,
      toggleDisplayed,
    }),
    [
      displaySourceIds,
      selectedCount,
      enabledIds.length,
      allSelected,
      noneSelected,
      setAllDisplayed,
      setNoneDisplayed,
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
