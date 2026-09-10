import { useTranslation } from 'react-i18next'
import type { Settings } from '../../lib/api'
import { Card, Field, Input } from '../../components/ui'
import { SettingsField } from './SettingsField'

const CONTEXT_PRESETS = [2048, 4096, 8192, 16384, 32768] as const

export function LlmSection({
  form,
  patch,
  openaiConfigured,
  apiKeyConfigured,
}: {
  form: Partial<Settings>
  patch: (patch: Partial<Settings>) => void
  openaiConfigured?: boolean
  apiKeyConfigured?: boolean
}) {
  const { t } = useTranslation()
  const ctx = Number(form.contextWindowTokens || 4096)
  const maxComp = Number(form.maxCompletionTokens || 1024)

  return (
    <Card>
      <h3 className="mb-1 font-serif text-lg">{t('settings.llmSection')}</h3>
      <p className="mb-3 text-xs text-muted">{t('settings.llmHint')}</p>
      <p className="mb-3 text-sm text-muted">
        {t('settings.llmReadyLabel')}{' '}
        <span className="font-mono text-ink">{openaiConfigured ? t('common.yes') : t('common.no')}</span>
        {' · '}
        {t('settings.apiKeyConfigured')}{' '}
        <span className="font-mono text-ink">{apiKeyConfigured ? t('common.yes') : t('common.no')}</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <SettingsField field="openaiBaseUrl" label={t('settings.baseUrl')} value={form.openaiBaseUrl} patch={patch} />
        <SettingsField field="openaiModel" label={t('settings.model')} value={form.openaiModel} patch={patch} />
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <h4 className="mb-1 text-sm font-medium text-ink">{t('settings.contextSection')}</h4>
        <p className="mb-3 text-xs text-muted">{t('settings.contextWindowHint')}</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {CONTEXT_PRESETS.map((n) => {
            const active = ctx === n
            return (
              <button
                key={n}
                type="button"
                className={`rounded-md border px-2.5 py-1 font-mono text-xs transition ${
                  active
                    ? 'border-moss bg-moss/10 text-moss'
                    : 'border-border bg-surface text-muted hover:border-accent/50 hover:text-ink'
                }`}
                onClick={() => {
                  patch({
                    contextWindowTokens: n,
                    maxCompletionTokens: Math.max(64, Math.min(maxComp, Math.floor(n / 2))),
                  })
                }}
              >
                {n >= 1024 ? `${n / 1024}k` : n}
              </button>
            )
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('settings.contextWindow')}>
            <Input
              type="number"
              min={1024}
              max={131072}
              step={1024}
              className="font-mono"
              value={String(form.contextWindowTokens ?? 4096)}
              onChange={(e) => patch({ contextWindowTokens: Number(e.target.value) })}
            />
          </Field>
          <Field label={t('settings.maxCompletion')}>
            <Input
              type="number"
              min={64}
              max={Math.max(64, Math.floor(ctx / 2))}
              step={64}
              className="font-mono"
              value={String(form.maxCompletionTokens ?? 1024)}
              onChange={(e) => patch({ maxCompletionTokens: Number(e.target.value) })}
            />
          </Field>
        </div>
        <p className="mt-2 font-mono text-xs text-muted">
          {t('settings.promptBudget', { budget: Math.max(512, ctx - maxComp) })}
        </p>
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-sm text-muted">{t('settings.aiParallelism')}</p>
          <p className="mt-1 font-mono text-sm text-ink">1</p>
          <p className="mt-1 text-xs text-muted">{t('settings.aiParallelismHint')}</p>
        </div>
      </div>
    </Card>
  )
}
