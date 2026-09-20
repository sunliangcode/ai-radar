import { describe, expect, it } from 'vitest'
import { sortChannelTypes } from './feedQuery'

describe('sortChannelTypes', () => {
  it('puts CN programmer sources first', () => {
    expect(sortChannelTypes(['GITHUB', 'RSS', 'ZHIHU', 'WEIBO', 'HACKER_NEWS'])).toEqual([
      'ZHIHU',
      'WEIBO',
      'RSS',
      'GITHUB',
      'HACKER_NEWS',
    ])
  })
})
