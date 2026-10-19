import { useTranslation } from 'react-i18next'
import type { Settings } from '../../lib/api'
import { Card, Field, Select } from '../../components/ui'

export function BasicsSection({
  form,
  patch,
}: {
  form: Partial<Settings>
  patch: (patch: Partial<Settings>) => void
}) {
  const { t } = useTranslation()
  return (
    <Card aria-labelledby="settings-basics-heading">
      <h3 id="settings-basics-heading" tabIndex={-1} className="mb-1 font-serif text-lg outline-none">
        {t('settings.basicsSection')}
      </h3>
      <p className="mb-3 text-xs text-muted">{t('settings.primaryLanguageHint')}</p>
      <Field label={t('settings.primaryLanguage')}>
        <Select
          value={form.summaryLanguage === 'en' ? 'en' : 'zh'}
          onChange={(e) => patch({ summaryLanguage: e.target.value })}
          aria-label={t('settings.primaryLanguage')}
        >
          <option value="zh">{t('settings.langZh')}</option>
          <option value="en">{t('settings.langEn')}</option>
        </Select>
      </Field>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {form.summaryLanguage === 'en' ? t('settings.langEn') : t('settings.langZh')}
      </p>
    </Card>
  )
}
