import { describe, expect, it } from 'vitest'
import { looksLikeEnglishImpactCopy, needsImpactRefresh } from './impactCopy'

describe('looksLikeEnglishImpactCopy', () => {
  it('flags known heuristic English phrases', () => {
    expect(looksLikeEnglishImpactCopy('Topic matches explicit_ignore in your Context.')).toBe(true)
    expect(looksLikeEnglishImpactCopy('Review and decide whether to run a small experiment.')).toBe(
      true,
    )
  })

  it('accepts Chinese product copy', () => {
    expect(looksLikeEnglishImpactCopy('命中你在 Context 里设的忽略主题。')).toBe(false)
    expect(looksLikeEnglishImpactCopy('建议做一次小试验再决定。')).toBe(false)
  })
})

describe('needsImpactRefresh', () => {
  it('only nudges when UI language is zh and copy is English', () => {
    expect(
      needsImpactRefresh('zh', 'Topic matches explicit_ignore in your Context.', null),
    ).toBe(true)
    expect(needsImpactRefresh('en', 'Topic matches explicit_ignore in your Context.', null)).toBe(
      false,
    )
    expect(needsImpactRefresh('zh', '命中你在 Context 里设的忽略主题。', null)).toBe(false)
  })
})
