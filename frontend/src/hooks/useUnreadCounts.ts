import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

/** Unread counts per source type, refreshed every minute (sidebar badge). */
export function useUnreadCounts() {
  return useQuery({
    queryKey: ['unread-counts'],
    queryFn: api.unreadCounts,
    refetchInterval: 60_000,
  })
}
