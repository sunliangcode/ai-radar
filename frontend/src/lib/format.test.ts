import { describe, expect, it } from 'vitest'
import { formatDuration, formatRelativeInstant, progressPercent } from './format'

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
