import { describe, expect, it } from 'vitest'
import { formatDuration, progressPercent } from './format'

describe('formatDuration', () => {
  it('formats milliseconds and seconds', () => {
    expect(formatDuration(null)).toBe('—')
    expect(formatDuration(420)).toBe('420ms')
    expect(formatDuration(1500)).toBe('1.5s')
    expect(formatDuration(65_000)).toBe('1:05')
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
