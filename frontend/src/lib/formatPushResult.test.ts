import { describe, expect, it } from 'vitest'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from '../i18n/locales/zh.json'
import { formatPushResult } from './formatPushResult'

const t = i18n.getFixedT('zh')

beforeAll(async () => {
  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      lng: 'zh',
      resources: { zh: { translation: zh } },
      interpolation: { escapeValue: false },
    })
  }
})

import { beforeAll } from 'vitest'

describe('formatPushResult', () => {
  it('reports no channels', () => {
    expect(formatPushResult({ skipped: true, reason: 'no_channels' }, t)).toContain('通道')
  })

  it('reports empty day', () => {
    expect(formatPushResult({ skipped: true, reason: 'no_items' }, t)).toContain('没有')
  })

  it('summarizes successful channels with item counts', () => {
    const msg = formatPushResult(
      {
        skipped: false,
        itemCount: 5,
        results: [{ channel: 'feishu', success: true, itemCount: 5 }],
      },
      t,
    )
    expect(msg).toContain('Feishu')
    expect(msg).toContain('5')
  })

  it('surfaces channel failure reasons', () => {
    const msg = formatPushResult(
      {
        skipped: false,
        itemCount: 3,
        results: [
          { channel: 'email', success: false, error: 'SMTP timeout' },
          { channel: 'feishu', success: true, itemCount: 3 },
        ],
      },
      t,
    )
    expect(msg).toContain('Email')
    expect(msg).toContain('SMTP timeout')
    expect(msg).toContain('Feishu')
  })
})
