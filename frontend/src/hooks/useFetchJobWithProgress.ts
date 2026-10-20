import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, api, type FetchProgress } from '../lib/api'
import { useToast } from '../components/providers/ToastProvider'

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

/** Overlapping fetch/push/cluster jobs return HTTP 409 (mutex). */
export function isJobConflict(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409
}

export function useFetchJobWithProgress(onSuccessInvalidate?: string[][]) {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const { push: pushToast } = useToast()
  const [phase, setPhase] = useState<FetchPhase>('idle')
  const [summaryProgress, setSummaryProgress] = useState<FetchProgress | null>(null)
  const [jobError, setJobError] = useState<Error | null>(null)
  /** True when POST returned 409 and we are polling the in-flight job. */
  const [joining, setJoining] = useState(false)
  const invalidateKeysRef = useRef(onSuccessInvalidate ?? DEFAULT_INVALIDATE)
  const joinedToastShown = useRef(false)

  useEffect(() => {
    invalidateKeysRef.current = onSuccessInvalidate ?? DEFAULT_INVALIDATE
  }, [onSuccessInvalidate])

  /**
   * Refresh everything the job may have changed, without touching the visible phase.
   *
   * <p>Callers used to call {@link dismiss} right after a job finished, which also reset the phase
   * to {@code idle} — so the fetch result summary (kept/failed counts, "retry failed sources")
   * flashed for a single frame and was never readable.
   */
  const invalidateAll = useCallback(async () => {
    for (const key of invalidateKeysRef.current) {
      await qc.invalidateQueries({ queryKey: key })
    }
    await qc.invalidateQueries({ queryKey: PROGRESS_KEY })
  }, [qc])

  const finishFromJob = useCallback(async () => {
    setJoining(false)
    joinedToastShown.current = false
    const finalSnap = await api.fetchProgress().catch(() => qc.getQueryData<FetchProgress>(PROGRESS_KEY))
    setSummaryProgress(finalSnap ?? EMPTY_PROGRESS)
    setPhase('summary')
    // Keep the summary on screen; the user dismisses it when done reading.
    void invalidateAll()
  }, [invalidateAll, qc])

  const joinInFlight = useCallback(async () => {
    setJobError(null)
    setJoining(true)
    setPhase('running')
    if (!joinedToastShown.current) {
      joinedToastShown.current = true
      pushToast('success', t('fetchProgress.joinedRunning'))
    }
    const snap = await api.fetchProgress().catch(() => null)
    if (snap) {
      qc.setQueryData(PROGRESS_KEY, snap)
      if (!snap.running) {
        await finishFromJob()
      }
    }
  }, [finishFromJob, pushToast, qc, t])

  const failJob = useCallback(
    async (err: unknown) => {
      setJoining(false)
      joinedToastShown.current = false
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
    [qc],
  )

  const fetchJob = useMutation({
    mutationFn: (opts?: { sourceType?: string }) => api.fetchJob(opts),
    onMutate: () => {
      setPhase('running')
      setSummaryProgress(null)
      setJobError(null)
      setJoining(false)
      joinedToastShown.current = false
      qc.setQueryData(PROGRESS_KEY, EMPTY_PROGRESS)
    },
    onSuccess: async () => {
      await finishFromJob()
    },
    onError: async (err) => {
      if (isJobConflict(err)) {
        await joinInFlight()
        return
      }
      await failJob(err)
    },
  })

  const retryFailed = useMutation({
    mutationFn: async (sourceTypes: string[]) => {
      const unique = [...new Set(sourceTypes.filter(Boolean))]
      for (const sourceType of unique) {
        await api.fetchJob({ sourceType })
      }
    },
    onMutate: () => {
      setPhase('running')
      setSummaryProgress(null)
      setJobError(null)
      setJoining(false)
      joinedToastShown.current = false
      qc.setQueryData(PROGRESS_KEY, EMPTY_PROGRESS)
    },
    onSuccess: async () => {
      await finishFromJob()
    },
    onError: async (err) => {
      if (isJobConflict(err)) {
        await joinInFlight()
        return
      }
      await failJob(err)
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

  // Joined a 409 in-flight job: when server reports idle, show summary.
  useEffect(() => {
    if (phase !== 'running' || !joining) return
    const p = progressQuery.data
    if (p && !p.running) {
      void finishFromJob()
    }
  }, [phase, joining, progressQuery.data, finishFromJob])

  const dismiss = useCallback(async () => {
    await invalidateAll()
    setSummaryProgress(null)
    setJobError(null)
    setJoining(false)
    joinedToastShown.current = false
    setPhase('idle')
  }, [invalidateAll])

  const liveProgress: FetchProgress | undefined =
    progressQuery.data ?? (polling ? EMPTY_PROGRESS : undefined)
  const progress: FetchProgress | undefined =
    phase === 'summary' ? (summaryProgress ?? undefined) : liveProgress

  return {
    fetchJob,
    retryFailed,
    phase,
    progress,
    dismiss,
    isPending: phase === 'running',
    error: jobError,
  }
}
