import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { changeMatchesDisplay } from '../lib/sourceFilter'
import { useDisplaySources } from './useDisplaySources'

/** Due decisions in the current display scope — for nav badges. */
export function useDecisionsDueCount() {
  const { displaySourceIds, noneSelected } = useDisplaySources()
  const due = useQuery({
    queryKey: ['decisions-due'],
    queryFn: () => api.decisions('due'),
    enabled: !noneSelected,
    refetchInterval: 60_000,
  })

  const count = useMemo(() => {
    if (noneSelected) return 0
    return (due.data ?? []).filter((d) => changeMatchesDisplay(d, displaySourceIds)).length
  }, [due.data, displaySourceIds, noneSelected])

  return { count, isLoading: due.isLoading }
}
