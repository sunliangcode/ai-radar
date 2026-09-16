const STORAGE_KEY = 'radar.engagement'

export type EngagementState = {
  lastVisitDate: string
  streak: number
  todayReadCount: number
  readCountDate: string
  /** Local date when Inbox Zero was last celebrated (once per day). */
  inboxZeroDate?: string
  /** Local date when Today deck clear was last celebrated. */
  deckClearedDate?: string
}

export const FETCH_DONE_TOAST_KEYS = [
  'fun.fetchDone1',
  'fun.fetchDone2',
  'fun.fetchDone3',
] as const

export const DECISION_TOAST_KEYS = [
  'fun.decision1',
  'fun.decision2',
  'fun.decision3',
] as const

export const INBOX_ZERO_TOAST_KEYS = [
  'fun.inboxZero1',
  'fun.inboxZero2',
] as const

export const DECK_CLEAR_TOAST_KEYS = [
  'fun.deckClear1',
  'fun.deckClear2',
] as const

/** Local calendar day YYYY-MM-DD. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function emptyState(today: string): EngagementState {
  return {
    lastVisitDate: today,
    streak: 1,
    todayReadCount: 0,
    readCountDate: today,
  }
}

export function loadEngagement(storage: Storage = localStorage): EngagementState {
  const today = localDateKey()
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyState(today)
    const parsed = JSON.parse(raw) as Partial<EngagementState>
    return {
      lastVisitDate: parsed.lastVisitDate ?? today,
      streak: typeof parsed.streak === 'number' ? parsed.streak : 1,
      todayReadCount: typeof parsed.todayReadCount === 'number' ? parsed.todayReadCount : 0,
      readCountDate: parsed.readCountDate ?? today,
      inboxZeroDate: parsed.inboxZeroDate,
      deckClearedDate: parsed.deckClearedDate,
    }
  } catch {
    return emptyState(today)
  }
}

export function saveEngagement(state: EngagementState, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/** Days between two YYYY-MM-DD keys (a − b). */
export function dayDiff(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00`)
  const db = new Date(`${b}T12:00:00`)
  return Math.round((da.getTime() - db.getTime()) / 86_400_000)
}

/**
 * First open of the day bumps streak (consecutive) or resets to 1.
 * Same-day revisits leave streak unchanged.
 */
export function recordVisit(
  now: Date = new Date(),
  storage: Storage = localStorage,
): EngagementState {
  const today = localDateKey(now)
  const prev = loadEngagement(storage)
  let next: EngagementState

  if (prev.lastVisitDate === today) {
    next = syncReadDay(prev, today)
  } else {
    const gap = dayDiff(today, prev.lastVisitDate)
    const streak = gap === 1 ? prev.streak + 1 : 1
    next = {
      ...prev,
      lastVisitDate: today,
      streak,
      todayReadCount: prev.readCountDate === today ? prev.todayReadCount : 0,
      readCountDate: today,
    }
  }

  saveEngagement(next, storage)
  return next
}

function syncReadDay(state: EngagementState, today: string): EngagementState {
  if (state.readCountDate === today) return state
  return { ...state, todayReadCount: 0, readCountDate: today }
}

export function recordRead(
  count = 1,
  now: Date = new Date(),
  storage: Storage = localStorage,
): EngagementState {
  const today = localDateKey(now)
  const prev = syncReadDay(loadEngagement(storage), today)
  const next: EngagementState = {
    ...prev,
    todayReadCount: prev.todayReadCount + Math.max(0, count),
    readCountDate: today,
  }
  saveEngagement(next, storage)
  return next
}

export function tryClaimInboxZero(
  now: Date = new Date(),
  storage: Storage = localStorage,
): { state: EngagementState; claimed: boolean } {
  const today = localDateKey(now)
  const prev = loadEngagement(storage)
  if (prev.inboxZeroDate === today) {
    return { state: prev, claimed: false }
  }
  const next = { ...prev, inboxZeroDate: today }
  saveEngagement(next, storage)
  return { state: next, claimed: true }
}

export function tryClaimDeckCleared(
  now: Date = new Date(),
  storage: Storage = localStorage,
): { state: EngagementState; claimed: boolean } {
  const today = localDateKey(now)
  const prev = loadEngagement(storage)
  if (prev.deckClearedDate === today) {
    return { state: prev, claimed: false }
  }
  const next = { ...prev, deckClearedDate: today }
  saveEngagement(next, storage)
  return { state: next, claimed: true }
}

export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

export const EXPLORE_VIEW_KEY = 'radar.exploreView'
export type ExploreView = 'waterfall' | 'focus'

export function loadExploreView(storage: Storage = localStorage): ExploreView {
  try {
    const v = storage.getItem(EXPLORE_VIEW_KEY)
    return v === 'focus' ? 'focus' : 'waterfall'
  } catch {
    return 'waterfall'
  }
}

export function saveExploreView(view: ExploreView, storage: Storage = localStorage): void {
  storage.setItem(EXPLORE_VIEW_KEY, view)
}
