/** Heuristic / LLM impact blurbs that still look English while the UI is zh. */
export function looksLikeEnglishImpactCopy(text?: string | null): boolean {
  if (!text) return false
  const t = text.trim()
  if (!t) return false
  if (
    /explicit_ignore|Topic matches|Limited overlap|Matches your Context|Review and decide|Adjusted by Memory/i.test(
      t,
    )
  ) {
    return true
  }
  const cjk = (t.match(/[\u4e00-\u9fff]/g) ?? []).length
  const letters = (t.match(/[A-Za-z]/g) ?? []).length
  return letters >= 24 && cjk === 0
}

export function needsImpactRefresh(
  summaryLanguage: 'zh' | 'en' | string | undefined,
  why?: string | null,
  recommendation?: string | null,
): boolean {
  const zh = !summaryLanguage || summaryLanguage === 'zh' || summaryLanguage.startsWith('zh')
  if (!zh) return false
  return looksLikeEnglishImpactCopy(why) || looksLikeEnglishImpactCopy(recommendation)
}
