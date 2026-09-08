import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api, type FetchProgress } from '../lib/api'

const PROGRESS_KEY = ['fetch-progress'] as const

const EMPTY_PROGRESS: FetchProgress = {
  running: true,
  stage: 'fetch',
  elapsedMs: 0,
  sources: [],
  totals: { total: 0, done: 0, running: 0, remaining: 0 },
}

export function useFetchJobWithProgress(onSuccessInvalidate?: string[][]) {
  const qc = useQueryClient()
  const [holdVisible, setHoldVisible] = useState(false)

  const fetchJob = useMutation({
    mutationFn: api.fetchJob,
    onMutate: () => {
      setHoldVisible(true)
      qc.setQueryData(PROGRESS_KEY, EMPTY_PROGRESS)
    },
    onSuccess: async () => {
      const keys = onSuccessInvalidate ?? [
        ['intelligence-home'],
        ['events'],
        ['items'],
        ['briefs'],
        ['sources'],
      ]
      for (const key of keys) {
        await qc.invalidateQueries({ queryKey: key })
      }
      await qc.invalidateQueries({ queryKey: PROGRESS_KEY })
    },
    onSettled: () => {
      window.setTimeout(() => setHoldVisible(false), 2200)
    },
  })

  const polling = fetchJob.isPending || holdVisible
  const progressQuery = useQuery({
    queryKey: PROGRESS_KEY,
    queryFn: api.fetchProgress,
    enabled: polling,
    refetchInterval: polling ? 300 : false,
    refetchIntervalInBackground: true,
    staleTime: 0,
    gcTime: 0,
  })

  useEffect(() => {
    if (!polling) return
    void qc.fetchQuery({ queryKey: PROGRESS_KEY, queryFn: api.fetchProgress })
  }, [polling, qc])

  const progress: FetchProgress | undefined =
    progressQuery.data ?? (polling ? EMPTY_PROGRESS : undefined)
  const showPanel = polling || Boolean(progress?.running)

  return {
    fetchJob,
    progress,
    showPanel,
    isPending: fetchJob.isPending,
    error: fetchJob.error as Error | null,
  }
}
