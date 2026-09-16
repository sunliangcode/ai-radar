import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  dayDiff,
  loadEngagement,
  localDateKey,
  pickRandom,
  recordRead,
  recordVisit,
  tryClaimDeckCleared,
  tryClaimInboxZero,
} from './engagement'

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial))
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, String(v))
    },
    removeItem: (k) => {
      map.delete(k)
    },
    key: (i) => [...map.keys()][i] ?? null,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('localDateKey / dayDiff', () => {
  it('formats local YYYY-MM-DD', () => {
    expect(localDateKey(new Date(2026, 8, 16, 15, 0, 0))).toBe('2026-09-16')
  })

  it('computes day gaps', () => {
    expect(dayDiff('2026-09-16', '2026-09-15')).toBe(1)
    expect(dayDiff('2026-09-16', '2026-09-14')).toBe(2)
    expect(dayDiff('2026-09-16', '2026-09-16')).toBe(0)
  })
})

describe('recordVisit streak', () => {
  it('starts streak at 1 on first visit', () => {
    const storage = memoryStorage()
    const s = recordVisit(new Date(2026, 8, 16), storage)
    expect(s.streak).toBe(1)
    expect(s.lastVisitDate).toBe('2026-09-16')
  })

  it('increments streak on consecutive days', () => {
    const storage = memoryStorage()
    recordVisit(new Date(2026, 8, 15), storage)
    const s = recordVisit(new Date(2026, 8, 16), storage)
    expect(s.streak).toBe(2)
  })

  it('resets streak after a gap', () => {
    const storage = memoryStorage()
    recordVisit(new Date(2026, 8, 14), storage)
    const s = recordVisit(new Date(2026, 8, 16), storage)
    expect(s.streak).toBe(1)
  })

  it('same-day revisit keeps streak', () => {
    const storage = memoryStorage()
    recordVisit(new Date(2026, 8, 16, 9), storage)
    const s = recordVisit(new Date(2026, 8, 16, 18), storage)
    expect(s.streak).toBe(1)
  })
})

describe('recordRead', () => {
  it('counts reads for the local day', () => {
    const storage = memoryStorage()
    recordVisit(new Date(2026, 8, 16), storage)
    recordRead(1, new Date(2026, 8, 16), storage)
    const s = recordRead(2, new Date(2026, 8, 16), storage)
    expect(s.todayReadCount).toBe(3)
  })

  it('resets read count across days', () => {
    const storage = memoryStorage()
    recordRead(5, new Date(2026, 8, 15), storage)
    const s = recordRead(1, new Date(2026, 8, 16), storage)
    expect(s.todayReadCount).toBe(1)
    expect(s.readCountDate).toBe('2026-09-16')
  })
})

describe('inbox zero / deck clear dedupe', () => {
  it('claims inbox zero once per day', () => {
    const storage = memoryStorage()
    const a = tryClaimInboxZero(new Date(2026, 8, 16), storage)
    expect(a.claimed).toBe(true)
    const b = tryClaimInboxZero(new Date(2026, 8, 16), storage)
    expect(b.claimed).toBe(false)
  })

  it('allows inbox zero again next day', () => {
    const storage = memoryStorage()
    tryClaimInboxZero(new Date(2026, 8, 15), storage)
    const r = tryClaimInboxZero(new Date(2026, 8, 16), storage)
    expect(r.claimed).toBe(true)
  })

  it('claims deck clear once per day', () => {
    const storage = memoryStorage()
    expect(tryClaimDeckCleared(new Date(2026, 8, 16), storage).claimed).toBe(true)
    expect(tryClaimDeckCleared(new Date(2026, 8, 16), storage).claimed).toBe(false)
  })
})

describe('loadEngagement / pickRandom', () => {
  it('returns defaults for empty storage', () => {
    const s = loadEngagement(memoryStorage())
    expect(s.streak).toBe(1)
    expect(s.todayReadCount).toBe(0)
  })

  it('picks from list', () => {
    const v = pickRandom(['a', 'b', 'c'] as const)
    expect(['a', 'b', 'c']).toContain(v)
  })
})
