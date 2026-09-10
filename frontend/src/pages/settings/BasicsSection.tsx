import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Settings } from '../../lib/api'
import { Card, Field, Select, Textarea } from '../../components/ui'
import { PreferenceKeywordsEditor } from './PreferenceKeywordsEditor'

export function BasicsSection({
  form,
  patch,
}: {
  form: Partial<Settings>
  patch: (patch: Partial<Settings>) => void
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <h3 className="mb-1 font-serif text-lg">{t('settings.basicsSection')}</h3>
      <p className="mb-3 text-xs text-muted">{t('settings.interestHint')}</p>
      <p className="mb-3 text-sm">
        <Link className="text-moss underline underline-offset-2" to="/settings/context">
          {t('settings.openContexts')}
        </Link>
      </p>
      <div className="grid gap-3">
        <Field label={t('settings.interestProfile')}>
          <Textarea
            rows={3}
            value={form.interestProfile ?? ''}
            onChange={(e) => patch({ interestProfile: e.target.value })}
          />
        </Field>
        <Field label={t('settings.primaryLanguage')} hint={t('settings.primaryLanguageHint')}>
          <Select
            value={form.summaryLanguage === 'en' ? 'en' : 'zh'}
            onChange={(e) => patch({ summaryLanguage: e.target.value })}
          >
            <option value="zh">{t('settings.langZh')}</option>
            <option value="en">{t('settings.langEn')}</option>
          </Select>
        </Field>
        <PreferenceKeywordsEditor />
      </div>
    </Card>
  )
}
