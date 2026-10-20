import { describe, expect, it } from 'vitest'
import {
  formatDuration,
  formatRelativeInstant,
  formatUnreadBadge,
  progressPercent,
  revisitDayDelta,
} from './format'

describe('formatUnreadBadge', () => {
  it('caps large counts and skips non-positive', () => {
    expect(formatUnreadBadge(0)).toBe('')
    expect(formatUnreadBadge(12)).toBe('12')
    expect(formatUnreadBadge(99)).toBe('99')
    expect(formatUnreadBadge(100)).toBe('99+')
    expect(formatUnreadBadge(4868)).toBe('99+')
    expect(formatUnreadBadge(1200, 999)).toBe('999+')
  })
})

describe('revisitDayDelta', () => {
  it('counts local calendar days', () => {
    const now = Date.parse('2026-10-20T15:00:00')
    expect(revisitDayDelta('2026-10-20T08:00:00', now)).toBe(0)
    expect(revisitDayDelta('2026-10-27T12:00:00', now)).toBe(7)
    expect(revisitDayDelta('2026-10-18T12:00:00', now)).toBe(-2)
  })
})

describe('formatDuration', () => {
  it('formats milliseconds and seconds', () => {
    expect(formatDuration(null)).toBe('—')
    expect(formatDuration(420)).toBe('420ms')
    expect(formatDuration(1500)).toBe('1.5s')
    expect(formatDuration(65_000)).toBe('1:05')
  })
})

describe('formatRelativeInstant', () => {
  const now = Date.parse('2026-01-15T10:00:00Z')

  it('returns null for missing or invalid input', () => {
    expect(formatRelativeInstant(null)).toBeNull()
    expect(formatRelativeInstant(undefined)).toBeNull()
    expect(formatRelativeInstant('not-a-date')).toBeNull()
  })

  it('formats future deltas', () => {
    expect(formatRelativeInstant('2026-01-15T10:00:30Z', now)).toBe('<1m')
    expect(formatRelativeInstant('2026-01-15T10:25:00Z', now)).toBe('25m')
    expect(formatRelativeInstant('2026-01-15T13:00:00Z', now)).toBe('3h')
    expect(formatRelativeInstant('2026-01-17T10:00:00Z', now)).toBe('2d')
  })

  it('formats past deltas with a minus prefix', () => {
    expect(formatRelativeInstant('2026-01-15T08:00:00Z', now)).toBe('-2h')
  })
})

describe('progressPercent', () => {
  const base = {
    stage: 'fetch',
    totals: { total: 10, done: 5 },
  }

  it('maps fetch progress into first half', () => {
    expect(progressPercent(base)).toBe(28)
  })

  it('returns 100 when done', () => {
    expect(progressPercent({ ...base, stage: 'done' })).toBe(100)
  })
})
