import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, type AiMonitorInFlight } from '../../lib/api'

/**
 * Ai monitor data source: polling query + SSE live stream.
 *
 * Merges streaming `responseSoFar` deltas (keyed by in-flight id) on top of
 * the polled snapshot, and tracks whether the SSE channel is live.
 */
export function useAiMonitorStream() {
  const [paused, setPaused] = useState(false)
  const [sseLive, setSseLive] = useState(false)
  const [streamFlights, setStreamFlights] = useState<Record<string, string>>({})

  const monitor = useQuery({
    queryKey: ['ai-monitor'],
    queryFn: api.aiMonitor,
    refetchInterval: (q) => {
      if (paused) return false
      if (sseLive) return 3000
      const flights = q.state.data?.inFlights?.length
        ? q.state.data.inFlights
        : q.state.data?.inFlight
          ? [q.state.data.inFlight]
          : []
      return flights.length > 0 ? 500 : 1000
    },
  })

  useEffect(() => {
    if (paused) return
    const es = new EventSource(api.aiMonitorStreamUrl())
    es.addEventListener('delta', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          id?: string
          responseSoFar?: string
        }
        if (data.id && data.responseSoFar != null) {
          setStreamFlights((prev) => ({ ...prev, [data.id!]: data.responseSoFar! }))
          setSseLive(true)
        }
      } catch {
        /* ignore */
      }
    })
    es.addEventListener('begin', () => setSseLive(true))
    es.addEventListener('complete', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as { id?: string }
        if (data.id) {
          setStreamFlights((prev) => {
            const next = { ...prev }
            delete next[data.id!]
            return next
          })
        }
      } catch {
        /* ignore */
      }
      void monitor.refetch()
    })
    es.addEventListener('queue', () => {
      void monitor.refetch()
    })
    es.onerror = () => setSseLive(false)
    return () => {
      es.close()
      setSseLive(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once per pause toggle
  }, [paused])

  const mon = monitor.data
  const inFlights: AiMonitorInFlight[] = (
    mon?.inFlights?.length
      ? mon.inFlights
      : mon?.inFlight
        ? [mon.inFlight]
        : []
  ).map((f) => ({
    ...f,
    responseSoFar: streamFlights[f.id] ?? f.responseSoFar,
  }))

  return { monitor, mon, inFlights, sseLive, paused, setPaused }
}
