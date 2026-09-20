import { describe, expect, it } from 'vitest'
import { changeMatchesDisplay, itemMatchesDisplay, parsePrimarySourceId } from './sourceFilter'
import {
  isSourceDisplayed,
  loadDisplaySourceIds,
  normalizeDisplaySourceIds,
  saveDisplaySourceIds,
  prefersDomesticBrowse,
  domesticSourceIds,
  foreignSourceIds,
  isDisplaySourceInitialized,
  DISPLAY_SOURCE_IDS_KEY,
} from './displaySources'

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

describe('parsePrimarySourceId', () => {
  it('extracts numeric id', () => {
    expect(parsePrimarySourceId('source:42')).toBe(42)
    expect(parsePrimarySourceId('11')).toBe(11)
  })
})

describe('display + item filter', () => {
  it('null allowlist shows all', () => {
    expect(isSourceDisplayed(1, null)).toBe(true)
    expect(itemMatchesDisplay({ primarySourceId: '1' }, null)).toBe(true)
  })

  it('empty allowlist shows none', () => {
    expect(itemMatchesDisplay({ primarySourceId: '1' }, [])).toBe(false)
  })

  it('does not treat 1 as matching 11', () => {
    expect(itemMatchesDisplay({ primarySourceId: '11' }, [1])).toBe(false)
    expect(itemMatchesDisplay({ primarySourceId: '1' }, [1])).toBe(true)
  })

  it('entity with sourceIds uses allowlist', () => {
    expect(changeMatchesDisplay({ sourceIds: [2, 3] }, [2])).toBe(true)
    expect(changeMatchesDisplay({ sourceIds: [2] }, [9])).toBe(false)
  })

  it('normalize collapses full selection to null', () => {
    expect(normalizeDisplaySourceIds([1, 2], [1, 2])).toBe(null)
    expect(normalizeDisplaySourceIds([], [1, 2])).toEqual([])
  })

  it('persists empty allowlist as []', () => {
    const storage = memoryStorage()
    saveDisplaySourceIds([], storage)
    expect(loadDisplaySourceIds(storage)).toEqual([])
    saveDisplaySourceIds(null, storage)
    expect(loadDisplaySourceIds(storage)).toBe(null)
  })
})

describe('domestic browse helpers', () => {
  it('detects zh locales', () => {
    expect(prefersDomesticBrowse('zh-CN', 'en-US')).toBe(true)
    expect(prefersDomesticBrowse('en', 'en-US')).toBe(false)
    expect(prefersDomesticBrowse(undefined, 'zh-TW')).toBe(true)
  })

  it('picks domestic source ids', () => {
    expect(
      domesticSourceIds([
        { id: 1, type: 'ZHIHU', enabled: true },
        { id: 2, type: 'HACKER_NEWS', enabled: true },
        { id: 3, type: 'WEIBO', enabled: false },
        { id: 4, type: 'RSS', enabled: true },
      ]),
    ).toEqual([1, 4])
  })

  it('picks foreign source ids', () => {
    expect(
      foreignSourceIds([
        { id: 1, type: 'ZHIHU', enabled: true },
        { id: 2, type: 'HACKER_NEWS', enabled: true },
        { id: 3, type: 'GITHUB', enabled: true },
      ]),
    ).toEqual([2, 3])
  })

  it('treats legacy allowlist as initialized', () => {
    const storage = memoryStorage({ [DISPLAY_SOURCE_IDS_KEY]: '[1,2]' })
    expect(isDisplaySourceInitialized(storage)).toBe(true)
  })
})
