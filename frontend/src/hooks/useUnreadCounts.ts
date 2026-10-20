import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useDisplaySources } from './useDisplaySources'

/** Unread counts for the current display scope (sidebar + tab badges). */
export function useUnreadCounts() {
  const { sourceIdsQuery, noneSelected } = useDisplaySources()
  const q = sourceIdsQuery ? `?${sourceIdsQuery}` : ''

  return useQuery({
    queryKey: ['unread-counts', sourceIdsQuery],
    queryFn: () => api.unreadCounts(q),
    enabled: !noneSelected,
    refetchInterval: 60_000,
  })
}
