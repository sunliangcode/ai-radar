import { describe, expect, it } from 'vitest'
import { cleanBriefMarkdown, parseBriefMarkdown } from './parseBriefMarkdown'

const SAMPLE = `# AI Radar Brief — 2026-09-16

Generated at 2026-09-16T06:06:09.997391Z (UTC)

## Top Items

### 1. Sample title?

- **Score**: 98
- **Category**: oss
- **Tags**: java, ai
- **URL**: https://example.com/a
- **Published**: 2026-09-13T11:14:42Z

【ZHIHU】Sample title?——Lead body here.

### 2. Second item

- **Score**: 85
- **URL**: https://example.com/b

Plain summary without prefix.
`

describe('parseBriefMarkdown', () => {
  it('strips machine header', () => {
    expect(cleanBriefMarkdown(SAMPLE)).not.toMatch(/^# AI Radar Brief/)
    expect(cleanBriefMarkdown(SAMPLE)).not.toMatch(/Generated at/)
  })

  it('parses ranked top items with metadata and cleaned lead', () => {
    const parsed = parseBriefMarkdown(SAMPLE)
    expect(parsed.topItems).toHaveLength(2)
    expect(parsed.topItems[0]).toMatchObject({
      rank: 1,
      title: 'Sample title?',
      score: 98,
      category: 'oss',
      tags: ['java', 'ai'],
      url: 'https://example.com/a',
      summary: 'Lead body here.',
    })
    expect(parsed.topItems[1].summary).toBe('Plain summary without prefix.')
  })
})
