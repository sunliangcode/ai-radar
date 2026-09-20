import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Source } from '../../lib/api'
import { Button, ConfirmDialog } from '../../components/ui'
import { SourceBadge } from '../../components/primitives/Badge'
import { groupSourcesByCategory } from '../../lib/sourceCategories'
import { cn, focusRingClass } from '../../lib/cn'

export function SourceList({
  sources,
  locale,
  fetchPending,
  testingSourceType,
  patchPendingId,
  removePending,
  onTestFetch,
  onToggleEnabled,
  onDelete,
}: {
  sources: Source[]
  locale: string
  fetchPending: boolean
  /** Specific type under test, `'*'` for a full fetch, or null when idle. */
  testingSourceType: string | null
  patchPendingId: number | null
  removePending: boolean
  onTestFetch: (sourceType: string) => void
  onToggleEnabled: (id: number, enabled: boolean) => void
  onDelete: (id: number) => void
}) {
  const { t } = useTranslation()
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  const wasRemoving = useRef(false)
  const groups = groupSourcesByCategory(sources)

  // Keep the confirm dialog open while delete is in flight so `pending` is visible;
  // close only after the mutation settles (success or error).
  useEffect(() => {
    if (removePending) {
      wasRemoving.current = true
      return
    }
    if (wasRemoving.current) {
      wasRemoving.current = false
      setDeleteTarget(null)
    }
  }, [removePending])

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
          if (deleteTarget) onDelete(deleteTarget.id)
        }}
        onCancel={() => {
          if (!removePending) setDeleteTarget(null)
        }}
      />

      <div className="space-y-6">
        {groups.map((group) => {
          const headingId = `source-cat-${group.id}`
          return (
          <section key={group.id} aria-labelledby={headingId}>
            <h2 id={headingId} className="mb-2 flex items-baseline gap-2 text-sm font-medium text-ink">
              <span>{t(`sources.category.${group.id}`)}</span>
              <span
                className="font-mono text-xs text-muted"
                aria-label={t('sources.categoryCount', { count: group.sources.length })}
              >
                {group.sources.length}
              </span>
            </h2>
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface/70">
              {group.sources.map((s) => {
                const rowFetching =
                  testingSourceType === '*' ||
                  (testingSourceType != null && testingSourceType === s.type)
                const rowBusy = rowFetching || patchPendingId === s.id
                return (
                  <li
                    key={s.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    aria-busy={rowBusy || undefined}
                  >
                    <div>
                      <Link
                        to={`/settings/sources/${s.id}`}
                        className={cn(
                          'inline-flex min-h-9 items-center rounded-sm font-medium text-ink hover:text-moss',
                          focusRingClass(),
                        )}
                      >
                        {s.name}
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <SourceBadge type={s.type} />
                        <span>
                          {s.enabled ? t('common.enabled') : t('common.disabled')}
                          {s.lastFetchedAt
                            ? ` · ${t('common.lastFetched', {
                                time: new Date(s.lastFetchedAt).toLocaleString(locale),
                              })}`
                            : ''}
                        </span>
                      </p>
                    </div>
                    <div
                      className="flex flex-wrap gap-2"
                      role="group"
                      aria-label={s.name}
                    >
                      <Button
                        variant="ghost"
                        disabled={fetchPending || !s.enabled}
                        loading={rowFetching}
                        title={s.enabled ? t('sources.testFetchHint') : t('sources.testFetchDisabled')}
                        onClick={() => onTestFetch(s.type)}
                      >
                        {rowFetching ? t('common.fetching') : t('sources.testFetch')}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={patchPendingId === s.id}
                        loading={patchPendingId === s.id}
                        aria-pressed={s.enabled}
                        onClick={() => onToggleEnabled(s.id, !s.enabled)}
                      >
                        {s.enabled ? t('sources.disable') : t('sources.enable')}
                      </Button>
                      <Button
                        variant="danger"
                        disabled={removePending}
                        onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
                      >
                        {t('sources.delete')}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
          )
        })}
      </div>
    </>
  )
}
