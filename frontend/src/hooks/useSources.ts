import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

/** Shared ['sources'] query — used by App shell, Feed, Today and Sources pages. */
export function useSources() {
  return useQuery({ queryKey: ['sources'], queryFn: api.sources })
}
