import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Source } from '../../lib/api'
import { Button, ConfirmDialog } from '../../components/ui'

export function SourceList({
  sources,
  locale,
  fetchPending,
  patchPending,
  removePending,
  onTestFetch,
  onToggleEnabled,
  onDelete,
}: {
  sources: Source[]
  locale: string
  fetchPending: boolean
  patchPending: boolean
  removePending: boolean
  onTestFetch: (sourceType: string) => void
  onToggleEnabled: (id: number, enabled: boolean) => void
  onDelete: (id: number) => void
}) {
  const { t } = useTranslation()
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)

  return (
    <>
      <ConfirmDialog
        open={deleteTarget != null}
        title={deleteTarget ? t('sources.deleteConfirm', { name: deleteTarget.name }) : ''}
        description={t('sources.deleteConfirmHint')}
        confirmLabel={t('sources.delete')}
        cancelLabel={t('common.cancel')}
        danger
        pending={removePending}
        onConfirm={() => {
          const target = deleteTarget
          setDeleteTarget(null)
          if (target) onDelete(target.id)
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ul className="divide-y divide-border rounded-xl border border-border bg-surface/70">
        {sources.map((s) => (
          <li
            key={s.id}
            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <Link to={`/settings/sources/${s.id}`} className="font-medium text-ink hover:text-moss">
                {s.name}
              </Link>
              <p className="mt-1 font-mono text-xs text-muted">
                {s.type} · {s.enabled ? t('common.enabled') : t('common.disabled')}
                {s.lastFetchedAt
                  ? ` · ${t('common.lastFetched', { time: new Date(s.lastFetchedAt).toLocaleString(locale) })}`
                  : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                disabled={fetchPending || !s.enabled}
                title={s.enabled ? t('sources.testFetchHint') : t('sources.testFetchDisabled')}
                onClick={() => onTestFetch(s.type)}
              >
                {fetchPending ? t('common.fetching') : t('sources.testFetch')}
              </Button>
              <Button
                variant="ghost"
                disabled={patchPending}
                onClick={() => onToggleEnabled(s.id, !s.enabled)}
              >
                {s.enabled ? t('sources.disable') : t('sources.enable')}
              </Button>
              <Button variant="danger" onClick={() => setDeleteTarget({ id: s.id, name: s.name })}>
                {t('sources.delete')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
