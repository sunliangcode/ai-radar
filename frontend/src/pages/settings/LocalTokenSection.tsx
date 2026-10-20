import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { persistLocalToken, readLocalToken } from '../../lib/api'
import { Button, Card, Field, Input, useToast } from '../../components/ui'

export function LocalTokenSection({
  serverConfigured,
  emphasize,
  onSaved,
}: {
  /** From settings when load succeeds; omit when unknown (e.g. 401 before token set). */
  serverConfigured?: boolean
  /** Highlight when settings/mutations are blocked without a token. */
  emphasize?: boolean
  onSaved?: () => void
}) {
  const { t } = useTranslation()
  const { push } = useToast()
  const [value, setValue] = useState(() => readLocalToken())
  const [saved, setSaved] = useState(false)

  const save = () => {
    persistLocalToken(value)
    setValue(readLocalToken())
    setSaved(true)
    push('success', t('settings.localTokenSaved'))
    onSaved?.()
    queueMicrotask(() =>
      document.getElementById('settings-local-token-heading')?.focus({ preventScroll: true }),
    )
  }

  return (
    <Card
      id="local-token"
      className={emphasize ? 'border-ember/40' : undefined}
      aria-labelledby="settings-local-token-heading"
    >
      <h3
        id="settings-local-token-heading"
        tabIndex={-1}
        className="mb-1 font-serif text-lg outline-none"
      >
        {t('settings.localToken')}
      </h3>
      {emphasize ? (
        <p className="mb-3 text-sm text-ember" role="status">
          {t('settings.localTokenRequired')}
        </p>
      ) : null}
      {serverConfigured ? (
        <p className="mb-2 text-xs text-moss" role="status">
          {t('settings.localTokenServer')} {t('common.yes')}
        </p>
      ) : null}
      <Field label={t('settings.localToken')} hint={t('settings.localTokenHint')}>
        <Input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={t('settings.localTokenPlaceholder')}
          onChange={(e) => {
            setValue(e.target.value)
            setSaved(false)
          }}
          aria-label={t('settings.localToken')}
        />
      </Field>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={save} aria-label={t('settings.localTokenSave')}>
          {t('settings.localTokenSave')}
        </Button>
        {saved ? (
          <span className="text-xs text-moss" role="status" aria-live="polite">
            {t('settings.localTokenSaved')}
          </span>
        ) : null}
      </div>
    </Card>
  )
}
