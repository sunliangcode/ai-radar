/**
 * Strip heuristic 【SOURCE】 / [SOURCE] prefixes and title-echo from feed card leads.
 * HeuristicAiService builds: 【TYPE】title——body
 */
export function cleanFeedLead(
  lead: string | null | undefined,
  title?: string | null,
): string | undefined {
  if (lead == null) return undefined
  let text = lead.trim()
  if (!text) return undefined

  text = text.replace(/^[【[][A-Za-z0-9_]+[】\]]\s*/u, '').trim()
  if (!text) return undefined

  const t = (title ?? '').trim()
  if (t) {
    if (text === t) return undefined
    const separators = ['——', '—', ' - ', '–', '。', '：', ':']
    for (const sep of separators) {
      const prefix = t + sep
      if (text.startsWith(prefix)) {
        const rest = text.slice(prefix.length).trim()
        return rest || undefined
      }
    }
    if (text.startsWith(t)) {
      const rest = text.slice(t.length).replace(/^[\s———–\-:：。]+/u, '').trim()
      return rest || undefined
    }
  }

  return text
}
