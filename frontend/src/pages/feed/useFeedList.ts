import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, type Item } from '../../lib/api'
import { useSources } from '../../hooks/useSources'
import { useDisplaySources } from '../../hooks/useDisplaySources'
import { itemMatchesDisplay } from '../../lib/sourceFilter'
import { PAGE, sinceIso, sortChannelTypes, type Range } from './feedQuery'

export type FeedPage = {
  items: Item[]
  total: number
  unreadTotal?: number
  nextCursor?: string | null
  hasMore?: boolean
  offset?: number
  limit?: number
}

export function useFeedList(progressRunning?: boolean) {
  const [range, setRange] = useState<Range>('24h')
  const [searchParams, setSearchParams] = useSearchParams()
  const sourceType = searchParams.get('sourceType') ?? ''
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [q, setQ] = useState('')
  const [inputQ, setInputQ] = useState('')
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
    return sortChannelTypes(Array.from(set))
  }, [sources.data, isDisplayed])

  const searchMode = q.trim().length > 1
  const since = sinceIso(range)

  useEffect(() => {
    const trimmed = inputQ.trim()
    if (!trimmed) {
      setQ('')
      return
    }
    const id = window.setTimeout(() => setQ(trimmed), 250)
    return () => window.clearTimeout(id)
  }, [inputQ])

  const feedQuery = useInfiniteQuery({
    queryKey: ['feed', range, sourceType, unreadOnly, sourceIdsQuery],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const parts = [`sort=score`, `limit=${PAGE}`]
      if (since) parts.push(`since=${encodeURIComponent(since)}`)
      if (unreadOnly) parts.push('unread=true')
      if (sourceType) parts.push(`sourceType=${encodeURIComponent(sourceType)}`)
      if (sourceIdsQuery) parts.push(sourceIdsQuery)
      if (pageParam) parts.push(`cursor=${encodeURIComponent(pageParam)}`)
      else parts.push('offset=0')
      return api.items(`?${parts.join('&')}`)
    },
    getNextPageParam: (last) => (last.hasMore && last.nextCursor ? last.nextCursor : undefined),
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
    if (searchMode) {
      const raw = searchQuery.data?.items ?? []
      if (displaySourceIds === null) return raw
      return raw.filter((item) => itemMatchesDisplay(item, displaySourceIds))
    }
    const raw = feedQuery.data?.pages.flatMap((p) => p.items) ?? []
    if (displaySourceIds === null) return raw
    return raw.filter((item) => itemMatchesDisplay(item, displaySourceIds))
  }, [displayBlocksAll, displaySourceIds, searchMode, searchQuery.data, feedQuery.data])

  const total = displayBlocksAll
    ? 0
    : searchMode
      ? items.length
      : (feedQuery.data?.pages[0]?.total ?? 0)

  const hasMore = !searchMode && Boolean(feedQuery.hasNextPage)
  const page = feedQuery.data?.pages.length ?? 1

  useEffect(() => {
    setSelectedId(null)
  }, [range, sourceType, unreadOnly, q, sourceIdsQuery])

  useEffect(() => {
    if (!sourceType) return
    if (!channelTypes.includes(sourceType)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('sourceType')
          return next
        },
        { replace: true },
      )
    }
  }, [sourceType, channelTypes, setSearchParams])

  useEffect(() => {
    if (items.length && selectedId == null) setSelectedId(items[0].id)
  }, [items, selectedId])

  const unreadCount = useMemo(() => {
    if (searchMode) return items.filter((i) => !i.read).length
    if (unreadOnly) return total
    const fromServer = feedQuery.data?.pages[0]?.unreadTotal
    if (typeof fromServer === 'number') return fromServer
    return items.filter((i) => !i.read).length
  }, [searchMode, unreadOnly, total, feedQuery.data, items])

  const clearSearch = () => {
    setInputQ('')
    setQ('')
  }

  const onSourceTypeChange = (v: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (v) next.set('sourceType', v)
        else next.delete('sourceType')
        return next
      },
      { replace: true },
    )
  }

  const loadMore = useCallback(() => {
    if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
      void feedQuery.fetchNextPage()
    }
  }, [feedQuery.hasNextPage, feedQuery.isFetchingNextPage, feedQuery.fetchNextPage])

  const changePage = (_next: number) => {
    loadMore()
  }

  const resetList = () => {
    setSelectedId(null)
    void feedQuery.refetch()
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
    since,
    feedQuery,
    searchQuery,
    items,
    total,
    unreadCount,
    hasMore,
    loadMore,
    isFetchingNextPage: feedQuery.isFetchingNextPage,
    clearSearch,
    onSourceTypeChange,
    changePage,
    resetList,
    markAllQuery: (() => {
      const parts: string[] = []
      if (since) parts.push(`since=${encodeURIComponent(since)}`)
      if (sourceType) parts.push(`sourceType=${encodeURIComponent(sourceType)}`)
      return parts.length ? `?${parts.join('&')}` : ''
    })(),
  }
}
