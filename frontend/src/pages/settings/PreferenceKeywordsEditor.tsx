import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, type PreferenceKeyword } from '../../lib/api'
import { Button, Input } from '../../components/ui'
import { useToast } from '../../components/providers/ToastProvider'

export function PreferenceKeywordsEditor() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const [likeDraft, setLikeDraft] = useState('')
  const [dislikeDraft, setDislikeDraft] = useState('')

  const keywords = useQuery({
    queryKey: ['preference-keywords'],
    queryFn: () => api.preferenceKeywords(),
  })

  const add = useMutation({
    mutationFn: (body: { kind: 'like' | 'dislike'; text: string }) => api.addPreferenceKeyword(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['preference-keywords'] })
      pushToast('success', t('settings.keywordAdded'))
    },
    onError: (e) => pushToast('error', (e as Error).message),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.deletePreferenceKeyword(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['preference-keywords'] })
    },
    onError: (e) => pushToast('error', (e as Error).message),
  })

  const list = keywords.data?.keywords ?? []
  const likes = list.filter((k) => k.kind === 'like')
  const dislikes = list.filter((k) => k.kind === 'dislike')

  const submit = (kind: 'like' | 'dislike') => {
    const text = (kind === 'like' ? likeDraft : dislikeDraft).trim()
    if (!text) return
    add.mutate(
      { kind, text },
      {
        onSuccess: () => {
          if (kind === 'like') setLikeDraft('')
          else setDislikeDraft('')
        },
      },
    )
  }

  return (
    <div className="mt-2 space-y-4 border-t border-border pt-4">
      <div>
        <p className="text-sm text-muted">{t('settings.likeKeywords')}</p>
        <p className="mb-2 text-xs text-faint">{t('settings.likeKeywordsHint')}</p>
        <KeywordChips keywords={likes} onRemove={(id) => remove.mutate(id)} />
        <div className="mt-2 flex gap-2">
          <Input
            className="flex-1 py-1.5"
            value={likeDraft}
            placeholder={t('settings.keywordPlaceholder')}
            onChange={(e) => setLikeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit('like')
              }
            }}
          />
          <Button type="button" variant="ghost" onClick={() => submit('like')} loading={add.isPending}>
            {t('settings.addKeyword')}
          </Button>
        </div>
      </div>
      <div>
        <p className="text-sm text-muted">{t('settings.dislikeKeywords')}</p>
        <p className="mb-2 text-xs text-faint">{t('settings.dislikeKeywordsHint')}</p>
        <KeywordChips keywords={dislikes} onRemove={(id) => remove.mutate(id)} />
        <div className="mt-2 flex gap-2">
          <Input
            className="flex-1 py-1.5"
            value={dislikeDraft}
            placeholder={t('settings.keywordPlaceholder')}
            onChange={(e) => setDislikeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit('dislike')
              }
            }}
          />
          <Button type="button" variant="ghost" onClick={() => submit('dislike')} loading={add.isPending}>
            {t('settings.addKeyword')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function KeywordChips({
  keywords,
  onRemove,
}: {
  keywords: PreferenceKeyword[]
  onRemove: (id: number) => void
}) {
  if (keywords.length === 0) {
    return <p className="text-xs text-faint">—</p>
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {keywords.map((k) => (
        <li
          key={k.id}
          className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-border/40 px-2 py-1 text-xs text-ink"
        >
          <span className="truncate" title={k.text}>
            {k.text}
          </span>
          <button
            type="button"
            className="shrink-0 text-muted hover:text-ember"
            onClick={() => onRemove(k.id)}
            aria-label="remove"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}
