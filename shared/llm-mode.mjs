/**
 * Map GET /api/health.llm into a doctor check row.
 * @param {{ mode?: string, model?: string, lastError?: string }|null|undefined} llm
 * @returns {null | { id: string, ok: boolean, level: 'ok'|'warn', detail: string, next?: string }}
 */
export function llmModeCheck(llm) {
  if (llm == null || llm.mode == null) return null
  const mode = typeof llm.mode === 'string' ? llm.mode.trim() : llm.mode
  if (mode === '') return null
  if (mode === 'ai') {
    return {
      id: 'llm',
      ok: true,
      level: 'ok',
      detail: llm.model ? `ai (${llm.model})` : 'ai',
    }
  }
  if (mode === 'heuristic') {
    return {
      id: 'llm',
      ok: true,
      level: 'warn',
      detail: 'heuristic — scoring uses rules (configure Settings → AI model / start Ollama)',
      next: 'Optional: ./bin/ai-radar health-llm  or configure OPENAI_* / local Ollama',
    }
  }
  if (mode === 'degraded') {
    return {
      id: 'llm',
      ok: false,
      level: 'warn',
      detail: llm.lastError
        ? `degraded — ${llm.lastError}`
        : 'degraded — live model failing; heuristics in use',
      next: './bin/ai-radar health-llm   to probe the configured model',
    }
  }
  return {
    id: 'llm',
    ok: false,
    level: 'warn',
    detail: `mode=${mode}`,
  }
}
