import { describe, expect, it } from 'vitest'
import { formatClock, monitorOpLabel } from './monitorUtils'

describe('formatClock', () => {
  it('formats a UTC instant with locale tags', () => {
    const iso = '2026-06-15T04:05:06.000Z'
    const en = formatClock(iso, 'en')
    const zh = formatClock(iso, 'zh')
    expect(en).toMatch(/\d{2}:\d{2}:\d{2}/)
    expect(zh).toMatch(/\d{2}:\d{2}:\d{2}/)
  })

  it('falls back for invalid input', () => {
    expect(formatClock('not-a-date')).toBe('not-a-date')
  })
})

describe('monitorOpLabel', () => {
  const t = (key: string) => `t:${key}`

  it('maps known operations through i18n', () => {
    expect(monitorOpLabel('chat', t)).toBe('t:settings.monitorOp.chat')
    expect(monitorOpLabel('analyzeImpact', t)).toBe('t:settings.monitorOp.analyzeImpact')
  })

  it('returns unknown codes unchanged', () => {
    expect(monitorOpLabel('customOp', t)).toBe('customOp')
  })
})
