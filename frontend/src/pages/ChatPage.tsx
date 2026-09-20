import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ChatCitedChange, type ChatMessage } from '../lib/api'
import { Button, Chip, ConfirmDialog, EmptyState, Input, PageHeader } from '../components/ui'
import { errorText } from '../lib/errors'
import { cn, focusRingClass, textLinkClass } from '../lib/cn'

const STORAGE_KEY = 'radar.chat.session.v1'

type StoredSession = {
  messages: ChatMessage[]
  citedChangeIds: number[]
  lastCited: ChatCitedChange[]
}

function loadSession(): StoredSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { messages: [], citedChangeIds: [], lastCited: [] }
    const parsed = JSON.parse(raw) as StoredSession
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      citedChangeIds: Array.isArray(parsed.citedChangeIds) ? parsed.citedChangeIds : [],
      lastCited: Array.isArray(parsed.lastCited) ? parsed.lastCited : [],
    }
  } catch {
    return { messages: [], citedChangeIds: [], lastCited: [] }
  }
}

function saveSession(session: StoredSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export default function ChatPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const seedParam = searchParams.get('changeId')
  const seedChangeId = seedParam && Number.isFinite(Number(seedParam)) ? Number(seedParam) : undefined

  const initial = loadSession()
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages)
  const [citedChangeIds, setCitedChangeIds] = useState<number[]>(initial.citedChangeIds)
  const [lastCited, setLastCited] = useState<ChatCitedChange[]>(initial.lastCited)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usedSeeds, setUsedSeeds] = useState<number[]>([])
  const [confirmClear, setConfirmClear] = useState(false)
  const pendingSeed =
    seedChangeId != null && !usedSeeds.includes(seedChangeId) ? seedChangeId : undefined
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    saveSession({ messages, citedChangeIds, lastCited })
  }, [messages, citedChangeIds, lastCited])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    bottomRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' })
  }, [messages, streaming])

  async function send(text: string) {
    const content = text.trim()
    if (!content || streaming) return

    setError(null)
    setInput('')
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages([...nextMessages, { role: 'assistant', content: '' }])
    setStreaming(true)

    const ac = new AbortController()
    abortRef.current = ac
    let assistant = ''

    try {
      const result = await api.chatStream(
        {
          messages: nextMessages,
          citedChangeIds,
          seedChangeId: pendingSeed,
        },
        {
          signal: ac.signal,
          onDelta: (delta) => {
            assistant += delta
            const snapshot = assistant
            setMessages((prev) => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = { role: 'assistant', content: snapshot }
              }
              return copy
            })
          },
        },
      )
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: result.reply || assistant }
        return copy
      })
      setCitedChangeIds(result.citedChangeIds)
      if (result.newlyCited.length) {
        setLastCited(result.newlyCited)
      }
      if (pendingSeed != null) {
        setUsedSeeds((prev) => (prev.includes(pendingSeed) ? prev : [...prev, pendingSeed]))
        if (searchParams.has('changeId')) {
          searchParams.delete('changeId')
          setSearchParams(searchParams, { replace: true })
        }
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        setMessages((prev) => {
          const copy = [...prev]
          if (copy[copy.length - 1]?.role === 'assistant' && !copy[copy.length - 1]?.content) {
            copy.pop()
          }
          return copy
        })
        return
      }
      setError(errorText(e, t))
      setMessages((prev) => {
        const copy = [...prev]
        if (copy[copy.length - 1]?.role === 'assistant' && !copy[copy.length - 1]?.content) {
          copy.pop()
        }
        return copy
      })
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function clearChat() {
    abortRef.current?.abort()
    setMessages([])
    setCitedChangeIds([])
    setLastCited([])
    setUsedSeeds([])
    setError(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const suggestions =
    pendingSeed != null
      ? [t('chat.suggestWhy'), t('chat.suggestCompare'), t('chat.suggestAction')]
      : [t('chat.suggestToday'), t('chat.suggestImpact'), t('chat.suggestAction')]

  return (
    <div className="flex min-h-[70vh] flex-col">
      <ConfirmDialog
        open={confirmClear}
        title={t('chat.clearConfirm')}
        description={t('chat.clearConfirmHint')}
        confirmLabel={t('chat.clear')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={() => {
          setConfirmClear(false)
          clearChat()
        }}
        onCancel={() => setConfirmClear(false)}
      />
      <PageHeader
        title={t('chat.title')}
        subtitle={t('chat.subtitle')}
        actions={
          <button
            type="button"
            disabled={streaming}
            aria-label={t('chat.clear')}
            onClick={() => {
              if (messages.length === 0 && !streaming) {
                clearChat()
                return
              }
              setConfirmClear(true)
            }}
            className={cn(
              'inline-flex min-h-9 items-center rounded-sm px-2 text-sm text-muted hover:text-ink disabled:opacity-40',
              focusRingClass(),
            )}
          >
            {t('chat.clear')}
          </button>
        }
      />

      {pendingSeed != null ? (
        <p className="mb-3 rounded-md border border-border bg-accent-soft/40 px-3 py-2 text-sm text-ink">
          {t('chat.seedHint', { id: pendingSeed })}{' '}
          <Link to={`/changes/${pendingSeed}`} className={`inline-flex min-h-9 items-center ${textLinkClass()}`}>
            {t('chat.openChange')}
          </Link>
        </p>
      ) : null}

      {lastCited.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">{t('chat.cited')}</span>
          {lastCited.map((c) => (
            <Link
              key={c.id}
              to={`/changes/${c.id}`}
              className={cn(
                'inline-flex min-h-9 items-center rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink hover:border-accent',
                focusRingClass(),
              )}
              title={c.summary}
            >
              #{c.id} {c.title?.slice(0, 36) || t('chat.untitled')}
              {c.tier ? ` · ${c.tier}` : ''}
            </Link>
          ))}
        </div>
      ) : null}

      <div
        className="flex flex-1 flex-col rounded-xl border border-border bg-surface/70"
        aria-busy={streaming || undefined}
      >
        <div
          className="flex-1 space-y-4 overflow-y-auto p-4"
          aria-label={t('chat.messagesLabel')}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.length === 0 ? (
            <EmptyState
              title={t('chat.emptyTitle')}
              description={t('chat.empty')}
              primary={
                <div
                  className="flex flex-wrap justify-center gap-2"
                  role="group"
                  aria-label={t('chat.emptyTitle')}
                >
                  {suggestions.map((s) => (
                    <Chip key={s} shape="pill" disabled={streaming} onClick={() => void send(s)}>
                      {s}
                    </Chip>
                  ))}
                </div>
              }
              secondary={
                pendingSeed == null ? (
                  <p className="text-xs text-faint">{t('chat.emptyHint')}</p>
                ) : undefined
              }
            />
          ) : (
            messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                data-role={m.role}
                aria-label={m.role === 'user' ? t('chat.roleUser') : t('chat.roleAssistant')}
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'ml-auto bg-accent-soft text-ink'
                    : 'mr-auto bg-border/40 text-ink'
                }`}
              >
                {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {error ? (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 border-t border-border px-4 py-2 text-sm text-ember"
          >
            <p className="min-w-0 flex-1">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className={cn(
                'inline-flex min-h-9 shrink-0 items-center rounded-sm px-2 text-xs text-muted hover:text-ink',
                focusRingClass(),
              )}
            >
              {t('common.dismiss')}
            </button>
          </div>
        ) : null}

        <form
          className="sticky bottom-0 flex gap-2 border-t border-border bg-surface/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm motion-reduce:backdrop-blur-none supports-[backdrop-filter]:bg-surface/80 motion-reduce:supports-[backdrop-filter]:bg-surface"
          aria-busy={streaming || undefined}
          onSubmit={(e) => {
            e.preventDefault()
            void send(input)
          }}
        >
          <Input
            className="min-w-0 flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chat.placeholder')}
            disabled={streaming}
            aria-label={t('chat.placeholder')}
          />
          {streaming ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => abortRef.current?.abort()}
              aria-label={t('chat.stop')}
            >
              {t('chat.stop')}
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()} aria-label={t('chat.send')}>
              {t('chat.send')}
            </Button>
          )}
        </form>
        {streaming ? (
          <p className="px-3 pb-2 text-xs text-muted" aria-live="polite">
            {t('chat.waiting')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
