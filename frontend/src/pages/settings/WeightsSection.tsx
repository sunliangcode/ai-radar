import { useTranslation } from 'react-i18next'
import type { Settings } from '../../lib/api'
import { Card } from '../../components/ui'

const WEIGHT_KEYS = [
  'hacker_news', 'github', 'github_trending', 'oss_insight', 'zhihu',
  'reddit', 'v2ex', 'telegram', 'product_hunt', 'twitter', 'rss',
  'google_news', 'gdelt', 'web',
] as const

export function WeightsSection({
  form,
  patch,
}: {
  form: Partial<Settings>
  patch: (patch: Partial<Settings>) => void
}) {
  const { t } = useTranslation()
  const weights = form.sourceWeights ?? {}

  return (
    <Card>
      <h3 className="mb-1 text-base font-medium text-ink">{t('settings.weightsSection')}</h3>
      <p className="mb-3 text-xs text-muted">{t('settings.weightsHint')}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {WEIGHT_KEYS.map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <span className="w-32 font-mono text-xs text-muted">{key}</span>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={Number(weights[key] ?? 0)}
              onChange={(e) =>
                patch({ sourceWeights: { ...weights, [key]: Number(e.target.value) } })
              }
              className="flex-1"
            />
            <span className="w-8 text-right font-mono text-xs text-ink">
              {Number(weights[key] ?? 0)}
            </span>
          </label>
        ))}
      </div>
    </Card>
  )
}
