import { describe, expect, it } from 'vitest'
import { isEditableTarget } from './a11y'

function el(tagName: string, contentEditable = false): EventTarget {
  return { tagName, isContentEditable: contentEditable } as unknown as EventTarget
}

describe('isEditableTarget', () => {
  it('returns false for null', () => {
    expect(isEditableTarget(null)).toBe(false)
  })

  it('detects input / textarea / select / contentEditable', () => {
    expect(isEditableTarget(el('INPUT'))).toBe(true)
    expect(isEditableTarget(el('TEXTAREA'))).toBe(true)
    expect(isEditableTarget(el('SELECT'))).toBe(true)
    expect(isEditableTarget(el('DIV', true))).toBe(true)
    expect(isEditableTarget(el('SPAN'))).toBe(false)
    expect(isEditableTarget(el('BUTTON'))).toBe(false)
  })
})
