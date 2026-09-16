import { describe, expect, it } from 'vitest'
import { cleanFeedLead } from './cleanFeedLead'

describe('cleanFeedLead', () => {
  it('strips 【SOURCE】 prefix', () => {
    expect(cleanFeedLead('【ZHIHU】hello world')).toBe('hello world')
  })

  it('strips [SOURCE] prefix', () => {
    expect(cleanFeedLead('[GITHUB] release notes')).toBe('release notes')
  })

  it('drops lead that only repeats the title', () => {
    const title = 'Kimi K3 的实际表现真有被吹捧的那么强吗？'
    expect(cleanFeedLead(`【ZHIHU】${title}`, title)).toBeUndefined()
  })

  it('keeps body after title—— separator', () => {
    const title = '如何看待 DeepSeek Harness？'
    expect(cleanFeedLead(`【ZHIHU】${title}——出了官方客户端。`, title)).toBe('出了官方客户端。')
  })

  it('returns undefined for empty / whitespace', () => {
    expect(cleanFeedLead('')).toBeUndefined()
    expect(cleanFeedLead('   ')).toBeUndefined()
    expect(cleanFeedLead(null)).toBeUndefined()
  })
})
