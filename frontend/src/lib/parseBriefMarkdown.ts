import { cleanFeedLead } from './cleanFeedLead'

export type BriefEvidenceLink = { title: string; url: string }

export type BriefEntry = {
  rank: number
  title: string
  score?: number
  category?: string
  tags: string[]
  url?: string
  published?: string
  status?: string
  summary: string
  impact?: string
  watchNext?: string
  evidence: BriefEvidenceLink[]
}

export type ParsedBrief = {
  events: BriefEntry[]
  topItems: BriefEntry[]
  emptyNote?: string
}

/** Drop machine header — page chrome shows date/title. */
export function cleanBriefMarkdown(markdown: string): string {
  return markdown
    .replace(/^#\s+(AI Radar Brief|Daily Intelligence)[^\n]*\n+/i, '')
    .replace(/^Generated at[^\n]*\n+/i, '')
    .trim()
}

function parseMetaLine(line: string): { key: string; value: string } | null {
  const m = line.match(/^\s*-\s+\*\*(.+?)\*\*:\s*(.+)\s*$/)
  if (!m) return null
  return { key: m[1].trim(), value: m[2].trim() }
}

function parseEvidenceLine(line: string): BriefEvidenceLink | null {
  const m = line.match(/^\s*-\s+\[(.+?)\]\((.+?)\)\s*$/)
  if (!m) return null
  return { title: m[1].trim(), url: m[2].trim() }
}

function applyMeta(entry: BriefEntry, key: string, value: string) {
  switch (key.toLowerCase()) {
    case 'score': {
      const n = Number.parseFloat(value)
      if (!Number.isNaN(n)) entry.score = n
      break
    }
    case 'category':
      entry.category = value
      break
    case 'tags':
      entry.tags = value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      break
    case 'url':
      entry.url = value
      break
    case 'published':
      entry.published = value
      break
    case 'status':
      entry.status = value
      break
    default:
      break
  }
}

function parseEntryBlock(rank: number, title: string, body: string): BriefEntry {
  const lines = body.split('\n')
  const entry: BriefEntry = {
    rank,
    title: title.trim(),
    tags: [],
    evidence: [],
    summary: '',
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i].replace(/\r$/, '')
    if (!line.trim()) {
      i += 1
      continue
    }
    const meta = parseMetaLine(line)
    if (meta) {
      applyMeta(entry, meta.key, meta.value)
      i += 1
      continue
    }
    break
  }

  const rest = lines.slice(i).join('\n').trim()
  if (!rest) return entry

  const impactMatch = rest.match(/\n\*\*Impact:\*\*\s*([\s\S]*?)(?=\n\*\*Watch next:\*\*|\nEvidence:|\n*$)/i)
  const watchMatch = rest.match(/\n\*\*Watch next:\*\*\s*([\s\S]*?)(?=\nEvidence:|\n*$)/i)
  const evidenceIdx = rest.search(/\nEvidence:\s*\n/i)

  let prose = rest
  if (impactMatch) {
    entry.impact = impactMatch[1].trim()
    prose = prose.replace(impactMatch[0], '')
  }
  if (watchMatch) {
    entry.watchNext = watchMatch[1].trim()
    prose = prose.replace(watchMatch[0], '')
  }

  if (evidenceIdx >= 0) {
    const before = prose.slice(0, evidenceIdx).trim()
    const evidenceBlock = prose.slice(evidenceIdx).replace(/^Evidence:\s*\n/i, '')
    for (const eline of evidenceBlock.split('\n')) {
      const link = parseEvidenceLine(eline)
      if (link) entry.evidence.push(link)
    }
    prose = before
  }

  const cleaned = cleanFeedLead(prose.trim(), entry.title) ?? prose.trim()
  entry.summary = cleaned
  return entry
}

function splitSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>()
  const parts = markdown.split(/^##\s+/m)
  for (const part of parts) {
    if (!part.trim()) continue
    const nl = part.indexOf('\n')
    const heading = (nl >= 0 ? part.slice(0, nl) : part).trim()
    const body = nl >= 0 ? part.slice(nl + 1).trim() : ''
    sections.set(heading.toLowerCase(), body)
  }
  return sections
}

function parseEntries(sectionBody: string): BriefEntry[] {
  const chunks = sectionBody.split(/^###\s+/m).filter(Boolean)
  const out: BriefEntry[] = []
  for (const chunk of chunks) {
    const firstLine = chunk.indexOf('\n')
    const head = firstLine >= 0 ? chunk.slice(0, firstLine).trim() : chunk.trim()
    const body = firstLine >= 0 ? chunk.slice(firstLine + 1) : ''
    const m = head.match(/^(\d+)\.\s*(.+)$/)
    if (!m) continue
    out.push(parseEntryBlock(Number.parseInt(m[1], 10), m[2], body))
  }
  return out
}

export function parseBriefMarkdown(markdown: string): ParsedBrief {
  const cleaned = cleanBriefMarkdown(markdown)
  if (!cleaned) return { events: [], topItems: [] }

  const empty = cleaned.match(/^_No items passed the score filter today\._\s*$/im)
  if (empty) {
    return { events: [], topItems: [], emptyNote: empty[0].replace(/^_|_$/g, '') }
  }

  const sections = splitSections(cleaned)
  const events = parseEntries(sections.get('events') ?? '')
  const topItems = parseEntries(sections.get('top items') ?? '')

  return { events, topItems }
}
