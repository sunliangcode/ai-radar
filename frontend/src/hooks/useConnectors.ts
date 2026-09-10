import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

/** Shared ['connectors'] query — connector descriptors for source forms. */
export function useConnectors() {
  return useQuery({ queryKey: ['connectors'], queryFn: api.connectors })
}
