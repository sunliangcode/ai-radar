import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

/** eventId → source ids from linked news items (for Today / impact filtering). */
export function useChangeSourceMap() {
  const q = useQuery({ queryKey: ['changes-list', 80], queryFn: () => api.changes(80) })
  return useMemo(() => {
    const map = new Map<number, number[]>()
    for (const c of q.data ?? []) {
      const eid = c.eventId ?? c.id
      if (eid != null) map.set(eid, c.sourceIds ?? [])
    }
    return map
  }, [q.data])
}
