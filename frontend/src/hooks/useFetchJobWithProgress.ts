import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api, type FetchProgress } from '../lib/api'

const PROGRESS_KEY = ['fetch-progress'] as const

export function useFetchJobWithProgress(onSuccessInvalidate?: string[][]) {
  const qc = useQueryClient()
  const [holdVisible, setHoldVisible] = useState(false)

  const fetchJob = useMutation({
    mutationFn: api.fetchJob,
    onMutate: () => {
      setHoldVisible(true)
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
    staleTime: 0,
  })

  useEffect(() => {
    if (fetchJob.isPending) {
      void qc.invalidateQueries({ queryKey: PROGRESS_KEY })
    }
  }, [fetchJob.isPending, qc])

  const progress: FetchProgress | undefined = progressQuery.data
  const showPanel =
    fetchJob.isPending ||
    holdVisible ||
    Boolean(progress?.running) ||
    (progress?.stage === 'done' && holdVisible) ||
    (progress?.stage === 'error' && holdVisible)

  return {
    fetchJob,
    progress,
    showPanel,
    isPending: fetchJob.isPending,
    error: fetchJob.error as Error | null,
  }
}
