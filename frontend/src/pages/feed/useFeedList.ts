import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, type Item } from '../../lib/api'
import { useSources } from '../../hooks/useSources'
import { useDisplaySources } from '../../hooks/useDisplaySources'
import { itemMatchesDisplay } from '../../lib/sourceFilter'
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
  const { sourceIdsQuery, displaySourceIds, isDisplayed } = useDisplaySources()
  const displayBlocksAll = displaySourceIds !== null && displaySourceIds.length === 0
  const hasSources = (sources.data?.length ?? 0) > 0

  const channelTypes = useMemo(() => {
    const set = new Set<string>()
    for (const s of sources.data ?? []) {
      if (s.type && s.enabled && isDisplayed(s.id)) set.add(s.type)
    }
    return Array.from(set).sort()
  }, [sources.data, isDisplayed])

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
    queryKey: ['feed', range, sourceType, unreadOnly, page, sourceIdsQuery],
    queryFn: () => {
      const parts = [`sort=score`, `limit=${PAGE}`, `offset=${offset}`]
      if (since) parts.push(`since=${encodeURIComponent(since)}`)
      if (unreadOnly) parts.push('unread=true')
      if (sourceType) parts.push(`sourceType=${encodeURIComponent(sourceType)}`)
      if (sourceIdsQuery) parts.push(sourceIdsQuery)
      return api.items(`?${parts.join('&')}`)
    },
    enabled: !displayBlocksAll,
    refetchInterval: () => (progressRunning ? 1500 : false),
  })

  const searchQuery = useQuery({
    queryKey: ['feed-search', q, sourceIdsQuery],
    queryFn: () => {
      const ids = sourceIdsQuery ? sourceIdsQuery.replace(/^sourceIds=/, '') : undefined
      return api.searchItems(q, 60, ids)
    },
    enabled: searchMode && !displayBlocksAll,
  })

  const items: Item[] = useMemo(() => {
    if (displayBlocksAll) return []
    const raw = searchMode ? (searchQuery.data?.items ?? []) : (feedQuery.data?.items ?? [])
    if (displaySourceIds === null) return raw
    return raw.filter((item) => itemMatchesDisplay(item, displaySourceIds))
  }, [displayBlocksAll, displaySourceIds, searchMode, searchQuery.data, feedQuery.data])
  const total = displayBlocksAll
    ? 0
    : searchMode
      ? items.length
      : (feedQuery.data?.total ?? 0)

  useEffect(() => {
    setPage(1)
    setSelectedId(null)
  }, [range, sourceType, unreadOnly, q, sourceIdsQuery])

  useEffect(() => {
    if (!sourceType) return
    if (!channelTypes.includes(sourceType)) {
      setSearchParams({}, { replace: true })
    }
  }, [sourceType, channelTypes, setSearchParams])

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
