#!/usr/bin/env node
/**
 * Read-only MCP stdio server for AI Radar.
 * Env:
 *   AI_RADAR_BASE_URL=http://127.0.0.1:8080
 *   LOCAL_TOKEN=... (optional)
 *   ALLOW_WRITES=true (optional; enables fetch/push/cluster tools)
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const BASE = (process.env.AI_RADAR_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '')
const TOKEN = process.env.LOCAL_TOKEN || ''
const ALLOW_WRITES = process.env.ALLOW_WRITES === 'true'

async function api(path, init = {}) {
  const headers = { ...(init.headers || {}) }
  if (TOKEN) headers['X-Local-Token'] = TOKEN
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${res.status} ${text}`)
  }
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const tools = [
  {
    name: 'list_events',
    description: 'List AI Radar events',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        minScore: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'get_event',
    description: 'Get one event with timeline and items',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
  {
    name: 'list_briefs',
    description: 'List daily brief dates',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_intelligence_home',
    description: 'Five-question intelligence home payload',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_sources',
    description: 'List configured sources',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_contexts',
    description: 'Get the single-user Context profile',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_high_impacts',
    description: 'List high/medium personal impacts from intelligence home',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_active_experiments',
    description: 'List running experiments',
    inputSchema: { type: 'object', properties: {} },
  },
]

if (ALLOW_WRITES) {
  tools.push(
    {
      name: 'run_fetch',
      description: 'Trigger fetch pipeline (write)',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'run_push',
      description: 'Trigger push job (write)',
      inputSchema: { type: 'object', properties: {} },
    }
  )
}

const server = new Server(
  { name: 'ai-radar', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name
  const args = request.params.arguments || {}

  if (!ALLOW_WRITES && (name === 'run_fetch' || name === 'run_push' || name === 'run_cluster')) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: 'writes_disabled' }) }],
      isError: true,
    }
  }

  let data
  switch (name) {
    case 'list_events': {
      const q = new URLSearchParams()
      if (args.status) q.set('status', String(args.status))
      if (args.minScore != null) q.set('minScore', String(args.minScore))
      if (args.limit != null) q.set('limit', String(args.limit))
      data = await api(`/api/events?${q}`)
      break
    }
    case 'get_event':
      data = await api(`/api/events/${args.id}`)
      break
    case 'list_briefs':
      data = await api('/api/briefs')
      break
    case 'get_intelligence_home':
      data = await api('/api/intelligence/home')
      break
    case 'list_sources':
      data = await api('/api/sources')
      break
    case 'list_contexts':
      data = await api('/api/contexts')
      break
    case 'list_high_impacts': {
      const home = await api('/api/intelligence/home')
      data = home.impacts || home.whyCare || []
      break
    }
    case 'list_active_experiments': {
      const all = await api('/api/experiments')
      data = Array.isArray(all) ? all.filter((e) => e.status === 'running') : all
      break
    }
    case 'run_fetch':
      data = await api('/api/jobs/fetch', { method: 'POST' })
      break
    case 'run_push':
      data = await api('/api/jobs/push', { method: 'POST' })
      break
    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      }
  }
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
})

const transport = new StdioServerTransport()
await server.connect(transport)
