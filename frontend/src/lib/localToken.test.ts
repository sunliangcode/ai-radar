import { describe, expect, it } from 'vitest'
import { normalizeLocalToken } from './api'

describe('normalizeLocalToken', () => {
  it('trims clipboard whitespace', () => {
    expect(normalizeLocalToken('  secret  ')).toBe('secret')
  })

  it('treats blank as unset', () => {
    expect(normalizeLocalToken('   ')).toBe('')
    expect(normalizeLocalToken(null)).toBe('')
    expect(normalizeLocalToken(undefined)).toBe('')
  })
})
