import { describe, expect, it } from 'vitest'
import { connectorTypeCategory, groupSourcesByCategory, sourceCategory } from './sourceCategories'

describe('sourceCategories', () => {
  it('classifies hot / wechat / media', () => {
    expect(sourceCategory({ name: '微博热搜', type: 'WEIBO' })).toBe('hot')
    expect(sourceCategory({ name: '百度热搜', type: 'DAILY_HOT' })).toBe('hot')
    expect(
      sourceCategory({
        name: '量子位 WeChat',
        type: 'RSS',
        config: { feedUrl: 'https://wechat2rss.xlab.app/feed/x.xml' },
      }),
    ).toBe('wechat')
    expect(sourceCategory({ name: '虎嗅', type: 'RSS', config: { feedUrl: 'https://rss.huxiu.com/' } })).toBe(
      'media',
    )
  })

  it('groups preserving category order', () => {
    const groups = groupSourcesByCategory([
      { id: 1, name: '虎嗅', type: 'RSS', config: { feedUrl: 'https://rss.huxiu.com/' } },
      { id: 2, name: '微博热搜', type: 'WEIBO' },
      { id: 3, name: 'Product Hunt', type: 'PRODUCT_HUNT' },
    ])
    expect(groups.map((g) => g.id)).toEqual(['hot', 'media', 'credentials'])
  })

  it('maps connector types for create form', () => {
    expect(connectorTypeCategory('DAILY_HOT')).toBe('hot')
    expect(connectorTypeCategory('HACKER_NEWS')).toBe('global')
  })
})
