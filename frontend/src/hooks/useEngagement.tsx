import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DECISION_TOAST_KEYS,
  DECK_CLEAR_TOAST_KEYS,
  FETCH_DONE_TOAST_KEYS,
  INBOX_ZERO_TOAST_KEYS,
  pickRandom,
  recordRead,
  recordVisit,
  tryClaimDeckCleared,
  tryClaimInboxZero,
  type EngagementState,
} from '../lib/engagement'

type EngagementApi = {
  streak: number
  todayReadCount: number
  bumpRead: (count?: number) => void
  claimInboxZero: () => boolean
  claimDeckCleared: () => boolean
  fetchDoneToastKey: () => string
  decisionToastKey: () => string
  inboxZeroToastKey: () => string
  deckClearToastKey: () => string
}

const EngagementContext = createContext<EngagementApi | null>(null)

export function EngagementProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EngagementState>(() => recordVisit())

  const bumpRead = useCallback((count = 1) => {
    setState(recordRead(count))
  }, [])

  const claimInboxZero = useCallback(() => {
    const r = tryClaimInboxZero()
    setState(r.state)
    return r.claimed
  }, [])

  const claimDeckCleared = useCallback(() => {
    const r = tryClaimDeckCleared()
    setState(r.state)
    return r.claimed
  }, [])

  const value = useMemo<EngagementApi>(
    () => ({
      streak: state.streak,
      todayReadCount: state.todayReadCount,
      bumpRead,
      claimInboxZero,
      claimDeckCleared,
      fetchDoneToastKey: () => pickRandom(FETCH_DONE_TOAST_KEYS),
      decisionToastKey: () => pickRandom(DECISION_TOAST_KEYS),
      inboxZeroToastKey: () => pickRandom(INBOX_ZERO_TOAST_KEYS),
      deckClearToastKey: () => pickRandom(DECK_CLEAR_TOAST_KEYS),
    }),
    [state.streak, state.todayReadCount, bumpRead, claimInboxZero, claimDeckCleared],
  )

  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>
}

export function useEngagement(): EngagementApi {
  const ctx = useContext(EngagementContext)
  if (!ctx) {
    throw new Error('useEngagement must be used within EngagementProvider')
  }
  return ctx
}
