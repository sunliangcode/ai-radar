import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, type Item } from '../../lib/api'
import { useSources } from '../../hooks/useSources'
import { useConnectors } from '../../hooks/useConnectors'
import { PAGE, sinceIso, type Range } from './feedQuery'

export function useFeedList(progressRunning?: boolean) {
  const [range, setRange] = useState<Range>('7d')
  const [searchParams, setSearchParams] = useSearchParams()
  const sourceType = searchParams.get('sourceType') ?? ''
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [q, setQ] = useState('')
  const [inputQ, setInputQ] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const sources = useSources()
  const connectors = useConnectors()
  const hasSources = (sources.data?.length ?? 0) > 0

  const channelTypes = useMemo(() => {
    const set = new Set<string>()
    for (const s of sources.data ?? []) if (s.type) set.add(s.type)
    for (const c of connectors.data ?? []) if (c.id) set.add(c.id)
    return Array.from(set).sort()
  }, [sources.data, connectors.data])

  const searchMode = q.trim().length > 1
  const since = sinceIso(range)
  const offset = (page - 1) * PAGE

  useEffect(() => {
    const trimmed = inputQ.trim()
    if (!trimmed) {
      setQ('')
      return
    }
    const id = window.setTimeout(() => setQ(trimmed), 250)
    return () => window.clearTimeout(id)
  }, [inputQ])

  const feedQuery = useQuery({
    queryKey: ['feed', range, sourceType, unreadOnly, page],
    queryFn: () => {
      const parts = [`sort=score`, `limit=${PAGE}`, `offset=${offset}`]
      if (since) parts.push(`since=${encodeURIComponent(since)}`)
      if (unreadOnly) parts.push('unread=true')
      if (sourceType) parts.push(`sourceType=${encodeURIComponent(sourceType)}`)
      return api.items(`?${parts.join('&')}`)
    },
    refetchInterval: () => (progressRunning ? 1500 : false),
  })

  const searchQuery = useQuery({
    queryKey: ['feed-search', q],
    queryFn: () => api.searchItems(q, 60),
    enabled: searchMode,
  })

  const items: Item[] = useMemo(
    () => (searchMode ? (searchQuery.data?.items ?? []) : (feedQuery.data?.items ?? [])),
    [searchMode, searchQuery.data, feedQuery.data],
  )
  const total = searchMode ? (searchQuery.data?.items.length ?? 0) : (feedQuery.data?.total ?? 0)

  useEffect(() => {
    setPage(1)
    setSelectedId(null)
  }, [range, sourceType, unreadOnly, q])

  useEffect(() => {
    if (items.length && selectedId == null) setSelectedId(items[0].id)
  }, [items, selectedId])

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items])

  const clearSearch = () => {
    setInputQ('')
    setQ('')
  }

  const onSourceTypeChange = (v: string) => {
    if (v) setSearchParams({ sourceType: v }, { replace: true })
    else setSearchParams({}, { replace: true })
  }

  const changePage = (next: number) => {
    setPage(next)
    setSelectedId(null)
  }

  const resetList = () => {
    setPage(1)
    setSelectedId(null)
  }

  return {
    range,
    setRange,
    sourceType,
    unreadOnly,
    setUnreadOnly,
    q,
    inputQ,
    setInputQ,
    page,
    selectedId,
    setSelectedId,
    hasSources,
    channelTypes,
    searchMode,
    feedQuery,
    searchQuery,
    items,
    total,
    unreadCount,
    clearSearch,
    onSourceTypeChange,
    changePage,
    resetList,
  }
}
