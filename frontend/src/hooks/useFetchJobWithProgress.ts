import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type FetchProgress } from '../lib/api'

const PROGRESS_KEY = ['fetch-progress'] as const

export type FetchPhase = 'idle' | 'running' | 'summary'

const EMPTY_PROGRESS: FetchProgress = {
  running: true,
  stage: 'fetch',
  elapsedMs: 0,
  sources: [],
  totals: { total: 0, done: 0, running: 0, remaining: 0 },
}

const DEFAULT_INVALIDATE: string[][] = [
  ['intelligence-home'],
  ['events'],
  ['items'],
  ['briefs'],
  ['sources'],
]

export function useFetchJobWithProgress(onSuccessInvalidate?: string[][]) {
  const qc = useQueryClient()
  const [phase, setPhase] = useState<FetchPhase>('idle')
  const [summaryProgress, setSummaryProgress] = useState<FetchProgress | null>(null)
  const [jobError, setJobError] = useState<Error | null>(null)
  const invalidateKeysRef = useRef(onSuccessInvalidate ?? DEFAULT_INVALIDATE)

  useEffect(() => {
    invalidateKeysRef.current = onSuccessInvalidate ?? DEFAULT_INVALIDATE
  }, [onSuccessInvalidate])

  const fetchJob = useMutation({
    mutationFn: (opts?: { sourceType?: string }) => api.fetchJob(opts),
    onMutate: () => {
      setPhase('running')
      setSummaryProgress(null)
      setJobError(null)
      qc.setQueryData(PROGRESS_KEY, EMPTY_PROGRESS)
    },
    onSuccess: async () => {
      const finalSnap = await api.fetchProgress().catch(() => qc.getQueryData<FetchProgress>(PROGRESS_KEY))
      setSummaryProgress(finalSnap ?? EMPTY_PROGRESS)
      setPhase('summary')
    },
    onError: async (err) => {
      setJobError(err as Error)
      const finalSnap = await api.fetchProgress().catch(() => qc.getQueryData<FetchProgress>(PROGRESS_KEY))
      setSummaryProgress(
        finalSnap ?? {
          ...EMPTY_PROGRESS,
          running: false,
          stage: 'error',
          error: (err as Error).message,
        },
      )
      setPhase('summary')
    },
  })

  const polling = phase === 'running'
  const progressQuery = useQuery({
    queryKey: PROGRESS_KEY,
    queryFn: api.fetchProgress,
    enabled: polling,
    refetchInterval: polling ? 800 : false,
    refetchIntervalInBackground: true,
    staleTime: 0,
    gcTime: 0,
  })

  useEffect(() => {
    if (!polling) return
    void qc.fetchQuery({ queryKey: PROGRESS_KEY, queryFn: api.fetchProgress })
  }, [polling, qc])

  const dismiss = useCallback(async () => {
    for (const key of invalidateKeysRef.current) {
      await qc.invalidateQueries({ queryKey: key })
    }
    await qc.invalidateQueries({ queryKey: PROGRESS_KEY })
    setSummaryProgress(null)
    setJobError(null)
    setPhase('idle')
  }, [qc])

  const liveProgress: FetchProgress | undefined =
    progressQuery.data ?? (polling ? EMPTY_PROGRESS : undefined)
  const progress: FetchProgress | undefined =
    phase === 'summary' ? (summaryProgress ?? undefined) : liveProgress

  return {
    fetchJob,
    phase,
    progress,
    dismiss,
    isPending: phase === 'running',
    error: jobError,
  }
}
