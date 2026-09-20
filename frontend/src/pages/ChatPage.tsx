import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ChatCitedChange, type ChatMessage } from '../lib/api'
import { Button, PageHeader, StateBox } from '../components/ui'
import { errorText } from '../lib/errors'

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
  const pendingSeed =
    seedChangeId != null && !usedSeeds.includes(seedChangeId) ? seedChangeId : undefined
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    saveSession({ messages, citedChangeIds, lastCited })
  }, [messages, citedChangeIds, lastCited])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
      <PageHeader
        title={t('chat.title')}
        subtitle={t('chat.subtitle')}
        actions={
          <button type="button" onClick={clearChat} className="text-sm text-muted hover:text-ink">
            {t('chat.clear')}
          </button>
        }
      />

      {pendingSeed != null ? (
        <p className="mb-3 rounded-md border border-border bg-accent-soft/40 px-3 py-2 text-sm text-ink">
          {t('chat.seedHint', { id: pendingSeed })}{' '}
          <Link to={`/changes/${pendingSeed}`} className="text-accent hover:underline">
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
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink hover:border-accent"
              title={c.summary}
            >
              #{c.id} {c.title?.slice(0, 36) || t('chat.untitled')}
              {c.tier ? ` · ${c.tier}` : ''}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col rounded-xl border border-border bg-surface/70">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <StateBox>
              <p className="text-sm font-medium text-ink">{t('chat.emptyTitle')}</p>
              <p className="mt-1 text-sm text-muted">{t('chat.empty')}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-md border border-border px-3 py-1.5 text-left text-sm text-ink hover:bg-border/50"
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {pendingSeed == null ? (
                <p className="mt-4 text-xs text-faint">{t('chat.emptyHint')}</p>
              ) : null}
            </StateBox>
          ) : (
            messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
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

        {error ? <p className="border-t border-border px-4 py-2 text-sm text-coral">{error}</p> : null}

        <form
          className="flex gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault()
            void send(input)
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chat.placeholder')}
            disabled={streaming}
          />
          <Button type="submit" loading={streaming} disabled={!input.trim()}>
            {t('chat.send')}
          </Button>
        </form>
        {streaming ? (
          <p className="px-3 pb-2 text-xs text-muted">{t('chat.waiting')}</p>
        ) : null}
      </div>
    </div>
  )
}
