import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, type Settings } from '../../lib/api'
import { errorText } from '../../lib/errors'
import { formatPushResult, type PushResultBody } from '../../lib/formatPushResult'
import { Button, Card, Field, Input, Select, useToast } from '../../components/ui'
import { cn, textLinkClass } from '../../lib/cn'

const PUSH_PRESETS = [
  { hour: 7, cron: '0 0 7 * * *' },
  { hour: 8, cron: '0 0 8 * * *' },
  { hour: 9, cron: '0 0 9 * * *' },
  { hour: 12, cron: '0 0 12 * * *' },
  { hour: 18, cron: '0 0 18 * * *' },
] as const

function cronToHour(cron: string | undefined): number | 'custom' {
  if (!cron) return 8
  const match = PUSH_PRESETS.find((p) => p.cron === cron)
  return match ? match.hour : 'custom'
}

function qrImageUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`
}

export function NotifySection({
  form,
  patch,
  emailTransportReady,
  feishuBound,
}: {
  form: Partial<Settings>
  patch: (patch: Partial<Settings>) => void
  emailTransportReady?: boolean
  feishuBound?: boolean
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { push } = useToast()
  const [bindSessionId, setBindSessionId] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const pushNow = useMutation({
    mutationFn: api.pushJob,
    onSuccess: (body) => {
      void qc.invalidateQueries({ queryKey: ['jobs-schedule'] })
      const result = body as PushResultBody
      const failed = (result.results ?? []).some((r) => r.success === false && !r.skipped)
      push(failed ? 'error' : 'success', formatPushResult(result, t))
    },
    onError: (e) => push('error', t('common.loadFailed', { message: errorText(e, t) })),
  })

  const startBind = useMutation({
    mutationFn: api.feishuBindStart,
    onSuccess: (body) => {
      setBindSessionId(body.sessionId)
      if (body.status === 'bound') {
        void qc.invalidateQueries({ queryKey: ['settings'] })
        push('success', t('settings.feishuBoundOk'))
        setBindSessionId(null)
      }
    },
    onError: (e) => push('error', t('common.loadFailed', { message: errorText(e, t) })),
  })

  const unbind = useMutation({
    mutationFn: api.feishuUnbind,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['settings'] })
      setBindSessionId(null)
      push('success', t('settings.feishuUnbound'))
    },
    onError: (e) => push('error', t('common.loadFailed', { message: errorText(e, t) })),
  })

  const bindStatus = useQuery({
    queryKey: ['feishu-bind', bindSessionId],
    queryFn: () => api.feishuBindStatus(bindSessionId!),
    enabled: Boolean(bindSessionId),
    refetchInterval: (q) => {
      const s = q.state.data?.status
      if (s === 'bound' || s === 'failed' || s === 'expired') return false
      return 2000
    },
  })

  useEffect(() => {
    const s = bindStatus.data?.status
    if (!s || !bindSessionId) return
    if (s === 'bound') {
      void qc.invalidateQueries({ queryKey: ['settings'] })
      push('success', bindStatus.data?.welcomeHint ? t('settings.feishuBoundOkHint') : t('settings.feishuBoundOk'))
      setBindSessionId(null)
    } else if (s === 'failed') {
      push('error', t('settings.feishuBindFailed', { error: bindStatus.data?.error ?? 'failed' }))
      setBindSessionId(null)
    } else if (s === 'expired') {
      push('error', t('settings.feishuBindExpired'))
      setBindSessionId(null)
    }
    // Toast once when the bind session reaches a terminal status (clearing sessionId stops re-entry).
  }, [bindStatus.data?.status, bindSessionId])

  const hour = cronToHour(form.pushCron)
  const qrUrl = bindStatus.data?.qrUrl ?? startBind.data?.qrUrl
  const binding = Boolean(bindSessionId) || startBind.isPending

  return (
    <Card id="notify" className="scroll-mt-20" aria-labelledby="notify-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 id="notify-heading" className="font-serif text-lg">
          {t('settings.notifySection')}
        </h3>
        <Button type="button" variant="ghost" loading={pushNow.isPending} onClick={() => pushNow.mutate()}>
          {pushNow.isPending ? t('common.pushing') : t('common.pushNow')}
        </Button>
      </div>

      <div className="grid gap-6">
        <div>
          <h4 className="mb-1 text-sm font-medium text-ink">{t('settings.emailChannel')}</h4>
          {emailTransportReady ? (
            <Field label={t('settings.smtpTo')} hint={t('settings.smtpToHint')}>
              <Input
                type="email"
                value={form.smtpTo ?? ''}
                onChange={(e) => patch({ smtpTo: e.target.value })}
                placeholder="you@example.com"
              />
            </Field>
          ) : (
            <p className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-muted">
              {t('settings.emailTransportMissing')}
            </p>
          )}
        </div>

        <div>
          <h4 className="mb-1 text-sm font-medium text-ink">{t('settings.feishuChannel')}</h4>
          {feishuBound ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-moss">{t('settings.feishuBound')}</span>
              <Button
                type="button"
                variant="ghost"
                loading={unbind.isPending}
                onClick={() => unbind.mutate()}
              >
                {t('settings.feishuUnbind')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3" aria-busy={binding || undefined}>
              <p className="text-sm text-muted">{t('settings.feishuBindHint')}</p>
              {!binding ? (
                <Button type="button" loading={startBind.isPending} onClick={() => startBind.mutate()}>
                  {t('settings.feishuBind')}
                </Button>
              ) : null}
              {qrUrl ? (
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                  <img
                    src={qrImageUrl(qrUrl)}
                    alt={t('settings.feishuQrAlt')}
                    width={220}
                    height={220}
                    className="rounded-md border border-border bg-white p-2"
                  />
                  <div className="max-w-xs text-sm text-muted">
                    <p>{t('settings.feishuScanHint')}</p>
                    <a
                      className={`mt-2 inline-flex min-h-9 items-center break-all ${textLinkClass('moss')}`}
                      href={qrUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('settings.feishuOpenLink')}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => setBindSessionId(null)}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : binding ? (
                <p className="text-sm text-muted" role="status" aria-live="polite">
                  {t('settings.feishuPreparingQr')}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <Field label={t('settings.pushTime')} hint={t('settings.pushTimeHint')}>
          <Select
            value={hour === 'custom' ? 'custom' : String(hour)}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'custom') return
              const preset = PUSH_PRESETS.find((p) => String(p.hour) === v)
              if (preset) patch({ pushCron: preset.cron })
            }}
          >
            {PUSH_PRESETS.map((p) => (
              <option key={p.hour} value={String(p.hour)}>
                {t('settings.pushTimeHour', { hour: p.hour })}
              </option>
            ))}
            {hour === 'custom' ? (
              <option value="custom">{t('settings.pushTimeCustom')}</option>
            ) : null}
          </Select>
        </Field>

        <div className="border-t border-border pt-3">
          <button
            type="button"
            className={cn('inline-flex min-h-9 items-center text-sm', textLinkClass())}
            onClick={() => setAdvancedOpen((o) => !o)}
            aria-expanded={advancedOpen}
            aria-controls="notify-advanced"
          >
            {advancedOpen ? t('settings.hideAdvanced') : t('settings.showAdvanced')}
          </button>
          {advancedOpen ? (
            <div id="notify-advanced" className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label={t('settings.timezone')} hint={t('settings.timezoneHint')}>
                <Input value={form.timezone ?? 'Asia/Shanghai'} readOnly className="opacity-80" />
              </Field>
              <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-sm text-sm sm:col-span-2 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent/40">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                  checked={Boolean(form.pushOnlyWhenItems)}
                  onChange={(e) => patch({ pushOnlyWhenItems: e.target.checked })}
                />
                <span>{t('settings.pushOnlyWhenItems')}</span>
              </label>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
