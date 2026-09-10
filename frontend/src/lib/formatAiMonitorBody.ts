/** Human-readable formatting of AI monitor prompt/response bodies (often JSON). */

export type MonitorBodyKind = 'input' | 'output'

const NARRATIVE_KEYS = [
  'summary',
  'reason',
  'why',
  'impact',
  'watchNext',
  'recommendation',
  'evidence',
  'keyword',
  'title',
  'actionTitle',
  'successCriteria',
  'content',
  'titleDisplay',
] as const

function stripCodeFence(raw: string): string {
  const t = raw.trim()
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i)
  return m ? m[1].trim() : t
}

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

/** Extract a JSON string value for `key`, including when the closing quote has not arrived yet. */
export function extractPartialStringField(raw: string, key: string): string | null {
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"?`, 'i')
  const m = raw.match(re)
  if (!m) return null
  return unescapeJsonString(m[1])
}

/** Prompt field labels (longest first so "Score reason" wins over "Score"). */
const PROMPT_LABELS = [
  'Instruction from the user',
  'Interest profile',
  'Dislike profile',
  'User context JSON',
  'Existing impact note',
  'Candidate events',
  'Member items',
  'Change title',
  'Change summary',
  'Score reason',
  'Memory hints',
  'User context',
  'Event title',
  'Recommendation',
  'User text',
  'Language',
  'Interest',
  'Snippet',
  'Summary',
  'Content',
  'Title',
  'Kind',
  'Why',
  'URL',
  'Item',
] as const

/** Labels that alone are not enough to treat extraction as successful. */
const WEAK_LABELS = new Set<string>(['Language', 'Kind'])

const LABEL_LINE_RE = (() => {
  const escaped = PROMPT_LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  // Label (optional parenthetical): optional same-line value
  return new RegExp(`^(${escaped.join('|')})(?:\\s*\\([^)]*\\))?\\s*:\\s*(.*)$`, 'i')
})()

const ITEMS_LABEL_RE = /^Items(?:\s+to\s+score)?\s*:\s*(.*)$/i

/** Display aliases for short prompt labels. */
const LABEL_DISPLAY: Record<string, string> = {
  Interest: 'Interest profile',
}

function isPlaceholder(v: string): boolean {
  return /^\{\{[^}]+\}\}$/.test(v.trim())
}

function formatItemsPreview(jsonText: string): string | null {
  const trimmed = jsonText.trim()
  if (!trimmed || isPlaceholder(trimmed)) return null
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (Array.isArray(parsed) && parsed.length > 0) {
      const titles = parsed
        .slice(0, 8)
        .map((it: { title?: string; index?: number }, i: number) => {
          const t = typeof it?.title === 'string' ? it.title : `#${it?.index ?? i}`
          return `- ${t}`
        })
      return `**Items (${parsed.length}):**\n${titles.join('\n')}`
    }
  } catch {
    const preview = trimmed.slice(0, 280)
    if (preview) return `**Items:**\n\`\`\`\n${preview}\n\`\`\``
  }
  return null
}

type ExtractedField = { label: string; value: string }

function isPromptSectionBoundary(line: string): boolean {
  if (LABEL_LINE_RE.test(line) || ITEMS_LABEL_RE.test(line)) return true
  if (/^Return ONLY(?: valid)? JSON/i.test(line)) return true
  if (/^Return JSON\b/i.test(line)) return true
  if (/^Rules\s*:/i.test(line)) return true
  return false
}

/**
 * Extract labeled prompt fields, including multi-line values and labels with
 * parenthetical notes (e.g. "Interest profile (prefer these topics):").
 */
function extractLabeledFields(prompt: string): ExtractedField[] {
  const rawLines = prompt.split(/\r?\n/)
  const fields: ExtractedField[] = []
  let i = 0

  while (i < rawLines.length) {
    const line = rawLines[i]
    const itemsMatch = line.match(ITEMS_LABEL_RE)
    if (itemsMatch) {
      const sameLine = itemsMatch[1].trim()
      const buf: string[] = []
      if (sameLine) buf.push(sameLine)
      i += 1
      while (i < rawLines.length) {
        buf.push(rawLines[i])
        i += 1
      }
      const preview = formatItemsPreview(buf.join('\n'))
      if (preview) fields.push({ label: 'Items', value: preview })
      break
    }

    const m = line.match(LABEL_LINE_RE)
    if (!m) {
      i += 1
      continue
    }

    const matched = m[1]
    const canonical =
      PROMPT_LABELS.find((l) => l.toLowerCase() === matched.toLowerCase()) ?? matched
    const label = LABEL_DISPLAY[canonical] ?? canonical
    const sameLine = m[2].trim()
    i += 1

    let value: string
    if (sameLine) {
      // Same-line value: do not swallow following instruction prose
      value = sameLine
    } else {
      // Block value: read until next label / schema / blank-line section break
      const valueLines: string[] = []
      while (i < rawLines.length) {
        const next = rawLines[i]
        if (isPromptSectionBoundary(next)) break
        // Blank line ends a block field when we already have content
        if (next.trim() === '' && valueLines.some((l) => l.trim())) {
          i += 1
          break
        }
        valueLines.push(next)
        i += 1
      }
      value = valueLines.join('\n').trim()
    }

    if (!value || isPlaceholder(value)) continue
    fields.push({ label, value })
  }

  return fields
}

function hasSubstantialInput(fields: ExtractedField[]): boolean {
  return fields.some((f) => f.label === 'Items' || !WEAK_LABELS.has(f.label))
}

function mergeExtractedFields(a: ExtractedField[], b: ExtractedField[]): ExtractedField[] {
  const byLabel = new Map<string, ExtractedField>()
  for (const f of [...a, ...b]) {
    const prev = byLabel.get(f.label)
    if (!prev || f.value.length > prev.value.length) {
      byLabel.set(f.label, f)
    }
  }
  const order: string[] = []
  for (const f of [...a, ...b]) {
    if (!order.includes(f.label)) order.push(f.label)
  }
  return order.map((l) => byLabel.get(l)!).filter(Boolean)
}

/**
 * Capture payload lines (bullets / JSON) that sit outside labeled fields —
 * e.g. free-form blocks that are correct user input but not key:value lines.
 */
function leftoverPayload(slice: string, fields: ExtractedField[]): string | null {
  if (!slice.trim()) return null
  const fieldText = fields.map((f) => f.value).join('\n')
  const keep: string[] = []
  for (const line of slice.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) {
      if (keep.length > 0 && keep[keep.length - 1] !== '') keep.push('')
      continue
    }
    if (/^Rules\s*:/i.test(t)) break
    if (LABEL_LINE_RE.test(line) || ITEMS_LABEL_RE.test(line)) continue
    if (/^Return ONLY(?: valid)? JSON/i.test(t) || /^Return JSON\b/i.test(t)) continue
    if (/^Categories must be/i.test(t)) continue
    if (/^You (are|summarize|extract)/i.test(t)) continue
    if (/^#\s/.test(t)) continue
    if (/^Write exactly/i.test(t) || /^Score each item/i.test(t)) continue
    if (/^Prefer assign/i.test(t) || /^If confidence/i.test(t) || /^eventId must/i.test(t)) continue
    if (/^[{}\[\],]$/.test(t) || /^"[a-zA-Z]+"\s*:/.test(t)) continue
    if (fieldText.includes(t)) continue
    // Payload-shaped lines only: JSON blobs or "- key: value" bullets
    if (t.startsWith('{') || t.startsWith('[') || /^-\s+[\w]+\s*:/.test(t)) {
      keep.push(line)
    }
  }
  while (keep.length > 0 && keep[keep.length - 1] === '') keep.pop()
  const text = keep.join('\n').trim()
  if (!text || text.length < 8) return null
  if (fields.length > 0 && text.length < 40 && fields.some((f) => f.value.includes(text))) {
    return null
  }
  return text
}

function formatExtractedFields(fields: ExtractedField[]): string {
  return fields
    .map((f) => {
      if (f.label === 'Items') return f.value
      // Multi-line → put value on following lines for readability
      if (f.value.includes('\n')) return `**${f.label}:**\n${f.value}`
      return `**${f.label}:** ${f.value}`
    })
    .join('\n\n')
}

/** Strip JSON-schema instruction blocks; keep payload after Return ONLY/Return JSON. */
function stripPromptSchema(raw: string): string | null {
  // Prefer cutting from a known payload label when present after schema
  const payloadLabelRe =
    /\n(?=(?:User text|User context(?: JSON)?|Content|Items(?: to score)?|Title|Instruction from the user|Item|Candidate events|Member items|Event title|Interest(?: profile)?|Memory hints|Change title|Why|Recommendation|Kind|Existing impact note)(?:\s*\([^)]*\))?\s*:)/i
  const returnOnly = raw.search(/Return ONLY(?: valid)? JSON/i)
  const returnJson = raw.search(/Return JSON\s*:/i)
  const schemaStart = [returnOnly, returnJson].filter((i) => i >= 0).sort((a, b) => a - b)[0]
  if (schemaStart == null) return null

  const afterSchema = raw.slice(schemaStart)
  const payloadAt = afterSchema.search(payloadLabelRe)
  if (payloadAt >= 0) {
    return afterSchema.slice(payloadAt).trim()
  }

  // Fallback: drop through first blank line after "Return … JSON"
  const stripped = raw
    .replace(/^[\s\S]*?Return ONLY(?: valid)? JSON[\s\S]*?\n\n/i, '')
    .replace(/^[\s\S]*?Return JSON\s*:[\s\S]*?\n\n/i, '')
    .trim()
  if (stripped && stripped.length < raw.length) return stripped
  return null
}

function formatScoreItems(items: unknown[]): string {
  return items
    .map((it, i) => {
      if (!it || typeof it !== 'object') return null
      const o = it as Record<string, unknown>
      const score = o.score != null ? String(o.score) : '—'
      const reason = typeof o.reason === 'string' ? o.reason : ''
      const tags = Array.isArray(o.tags) ? o.tags.filter((t) => typeof t === 'string').join(', ') : ''
      const cat = typeof o.category === 'string' ? o.category : ''
      const idx = o.index != null ? o.index : i
      const meta = [cat, tags].filter(Boolean).join(' · ')
      return `**#${idx} · ${score}**${meta ? ` · ${meta}` : ''}\n${reason || '—'}`
    })
    .filter(Boolean)
    .join('\n\n')
}

function formatSummarizeItems(items: unknown[]): string {
  return items
    .map((it, i) => {
      if (!it || typeof it !== 'object') return null
      const o = it as Record<string, unknown>
      const title = typeof o.titleDisplay === 'string' ? o.titleDisplay : null
      const summary = typeof o.summary === 'string' ? o.summary : ''
      const idx = o.index != null ? o.index : i
      return title ? `**#${idx} · ${title}**\n${summary}` : `**#${idx}**\n${summary || '—'}`
    })
    .filter(Boolean)
    .join('\n\n')
}

function formatSteps(steps: unknown[]): string {
  return steps
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n')
}

function formatCompleteObject(obj: Record<string, unknown>, operation: string): string | null {
  const op = operation.toLowerCase()

  if (Array.isArray(obj.items) && obj.items.length > 0) {
    if (op.includes('score')) return formatScoreItems(obj.items)
    if (op.includes('summarize')) return formatSummarizeItems(obj.items)
    // generic items
    const first = obj.items[0]
    if (first && typeof first === 'object') {
      const sample = first as Record<string, unknown>
      if (typeof sample.reason === 'string' || typeof sample.score === 'number') {
        return formatScoreItems(obj.items)
      }
      if (typeof sample.summary === 'string') return formatSummarizeItems(obj.items)
      if (typeof sample.content === 'string' || typeof sample.title === 'string') {
        return obj.items
          .map((it, i) => {
            if (!it || typeof it !== 'object') return null
            const o = it as Record<string, unknown>
            const title = typeof o.title === 'string' ? o.title : `#${i}`
            const content = typeof o.content === 'string' ? o.content : ''
            const url = typeof o.url === 'string' ? o.url : ''
            return `**${title}**${url ? `\n${url}` : ''}${content ? `\n${content}` : ''}`
          })
          .filter(Boolean)
          .join('\n\n')
      }
    }
  }

  const parts: string[] = []

  if (typeof obj.titleDisplay === 'string' && obj.titleDisplay) {
    parts.push(`### ${obj.titleDisplay}`)
  } else if (typeof obj.title === 'string' && obj.title && !op.includes('suggest')) {
    parts.push(`### ${obj.title}`)
  }

  if (typeof obj.summary === 'string' && obj.summary) parts.push(obj.summary)
  if (typeof obj.reason === 'string' && obj.reason) parts.push(obj.reason)
  if (typeof obj.why === 'string' && obj.why) parts.push(`**Why:** ${obj.why}`)
  if (typeof obj.impact === 'string' && obj.impact) parts.push(`**Impact:** ${obj.impact}`)
  if (typeof obj.watchNext === 'string' && obj.watchNext) parts.push(`**Watch next:** ${obj.watchNext}`)
  if (typeof obj.evidence === 'string' && obj.evidence) parts.push(`**Evidence:** ${obj.evidence}`)
  if (typeof obj.recommendation === 'string' && obj.recommendation) {
    parts.push(`**Recommendation:** ${obj.recommendation}`)
  }
  if (typeof obj.keyword === 'string' && obj.keyword) parts.push(obj.keyword)
  if (typeof obj.actionTitle === 'string' && obj.actionTitle) parts.push(`### ${obj.actionTitle}`)
  else if (typeof obj.title === 'string' && obj.title && op.includes('suggest')) {
    parts.push(`### ${obj.title}`)
  }
  if (Array.isArray(obj.steps) && obj.steps.length > 0) {
    parts.push(formatSteps(obj.steps))
  }
  if (typeof obj.successCriteria === 'string' && obj.successCriteria) {
    parts.push(`**Success:** ${obj.successCriteria}`)
  }
  if (typeof obj.content === 'string' && obj.content) parts.push(obj.content)

  // Numeric impact-style fields
  const nums = ['relevance', 'impact', 'urgency', 'confidence', 'effort', 'score']
  const numBits = nums
    .filter((k) => typeof obj[k] === 'number')
    .map((k) => `${k} ${obj[k]}`)
  if (typeof obj.tier === 'string') numBits.push(`tier ${obj.tier}`)
  if (typeof obj.shouldAct === 'boolean') numBits.push(obj.shouldAct ? 'should act' : 'skip')
  if (numBits.length > 0 && parts.length > 0) {
    parts.unshift(numBits.join(' · '))
  } else if (numBits.length > 0) {
    parts.push(numBits.join(' · '))
  }

  // Nested profile.summary
  if (obj.profile && typeof obj.profile === 'object') {
    const p = obj.profile as Record<string, unknown>
    if (typeof p.summary === 'string' && p.summary) parts.push(p.summary)
    if (typeof p.role === 'string' && p.role) parts.push(`**Role:** ${p.role}`)
  }

  return parts.length > 0 ? parts.join('\n\n') : null
}

function formatPartialStreaming(raw: string, operation: string): string | null {
  const op = operation.toLowerCase()
  const parts: string[] = []

  // Score/summarize batch: extract each reason/summary as they appear
  if (op.includes('score') || (op.includes('summarize') && raw.includes('"items"'))) {
    const reasonRe = /"reason"\s*:\s*"((?:\\.|[^"\\])*)"?/gi
    const summaryRe = /"summary"\s*:\s*"((?:\\.|[^"\\])*)"?/gi
    const scoreRe = /"score"\s*:\s*(\d+)/gi
    const reasons: string[] = []
    let m: RegExpExecArray | null
    while ((m = reasonRe.exec(raw))) reasons.push(unescapeJsonString(m[1]))
    const summaries: string[] = []
    while ((m = summaryRe.exec(raw))) summaries.push(unescapeJsonString(m[1]))
    const scores: string[] = []
    while ((m = scoreRe.exec(raw))) scores.push(m[1])

    if (reasons.length > 0) {
      return reasons
        .map((r, i) => `**#${i}${scores[i] != null ? ` · ${scores[i]}` : ''}**\n${r}`)
        .join('\n\n')
    }
    if (summaries.length > 0) {
      return summaries.map((s, i) => `**#${i}**\n${s}`).join('\n\n')
    }
  }

  const titleDisplay = extractPartialStringField(raw, 'titleDisplay')
  if (titleDisplay) parts.push(`### ${titleDisplay}`)

  for (const key of NARRATIVE_KEYS) {
    if (key === 'titleDisplay') continue
    const v = extractPartialStringField(raw, key)
    if (!v) continue
    if (key === 'summary' || key === 'reason' || key === 'keyword' || key === 'content') {
      parts.push(v)
    } else if (key === 'title' || key === 'actionTitle') {
      if (!titleDisplay) parts.push(`### ${v}`)
    } else if (key === 'impact') {
      parts.push(`**Impact:** ${v}`)
    } else if (key === 'watchNext') {
      parts.push(`**Watch next:** ${v}`)
    } else if (key === 'why') {
      parts.push(`**Why:** ${v}`)
    } else if (key === 'evidence') {
      parts.push(`**Evidence:** ${v}`)
    } else if (key === 'recommendation') {
      parts.push(`**Recommendation:** ${v}`)
    } else if (key === 'successCriteria') {
      parts.push(`**Success:** ${v}`)
    }
  }

  // Partial steps array: "steps": ["a", "b
  const stepsMatch = raw.match(/"steps"\s*:\s*\[([\s\S]*)/)
  if (stepsMatch) {
    const stepStrs: string[] = []
    const stepRe = /"((?:\\.|[^"\\])*)"?/g
    let sm: RegExpExecArray | null
    while ((sm = stepRe.exec(stepsMatch[1]))) {
      stepStrs.push(unescapeJsonString(sm[1]))
    }
    if (stepStrs.length > 0) parts.push(formatSteps(stepStrs))
  }

  return parts.length > 0 ? parts.join('\n\n') : null
}

/**
 * Format monitor body for ChatGPT-like display.
 * Returns markdown-ish prose; falls back to trimmed raw if nothing extractable.
 */
export function formatAiMonitorBody(
  body: string,
  options: { kind: MonitorBodyKind; operation: string },
): { text: string; isStructured: boolean } {
  const raw = (body || '').trim()
  if (!raw || raw === '—') return { text: raw || '—', isStructured: false }

  if (options.kind === 'input') {
    const fields = extractLabeledFields(raw)
    const withoutSchema = stripPromptSchema(raw)
    const payloadFields = withoutSchema ? extractLabeledFields(withoutSchema) : []
    const merged = mergeExtractedFields(fields, payloadFields)
    if (hasSubstantialInput(merged)) {
      let text = formatExtractedFields(merged)
      const leftover = leftoverPayload(withoutSchema ?? raw, merged)
      if (leftover && !text.includes(leftover.slice(0, Math.min(48, leftover.length)))) {
        text = `${text}\n\n${leftover}`
      }
      return { text, isStructured: true }
    }
    // Soften long prompts: payload after schema / instruction block
    if (withoutSchema) {
      const preview =
        withoutSchema.length > 600 ? `${withoutSchema.slice(0, 600)}…` : withoutSchema
      return { text: preview, isStructured: true }
    }
    const preview = raw.length > 500 ? `${raw.slice(0, 500)}…` : raw
    return { text: preview, isStructured: false }
  }

  // OUTPUT
  const stripped = stripCodeFence(raw)
  try {
    const parsed = JSON.parse(stripped) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const formatted = formatCompleteObject(parsed as Record<string, unknown>, options.operation)
      if (formatted) return { text: formatted, isStructured: true }
    }
    if (Array.isArray(parsed)) {
      const formatted = formatScoreItems(parsed)
      if (formatted) return { text: formatted, isStructured: true }
    }
  } catch {
    /* partial JSON — continue */
  }

  const partial = formatPartialStreaming(stripped, options.operation)
  if (partial) return { text: partial, isStructured: true }

  // Plain prose (non-JSON responses)
  if (!stripped.trimStart().startsWith('{') && !stripped.trimStart().startsWith('[')) {
    return { text: stripped, isStructured: false }
  }

  return { text: stripped, isStructured: false }
}
