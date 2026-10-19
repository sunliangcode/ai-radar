/**
 * Map GET /api/health/llm into a doctor soft-warn when the model is missing.
 * @param {{ ok?: boolean, modelPresent?: boolean, model?: string, models?: string[] }|null|undefined} probe
 * @returns {null | { id: string, ok: boolean, level: 'warn', detail: string, data?: object, next?: string }}
 */
export function modelPresentCheck(probe) {
  if (probe == null || probe.ok !== true || probe.modelPresent !== false) {
    return null
  }
  const model = probe.model ?? ''
  return {
    id: 'modelPresent',
    ok: true,
    level: 'warn',
    detail: `endpoint up but model "${model}" not in models[]`,
    data: { model: probe.model ?? null, models: probe.models ?? [] },
    next: 'Pull OPENAI_MODEL or pick an id from models[] · ./bin/ai-radar health-llm',
  }
}
