import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { errorText } from './errors'

const t = (key: string) => `t:${key}`

describe('errorText', () => {
  it('localizes offline / unreachable-backend failures instead of leaking "Failed to fetch"', () => {
    expect(errorText(new ApiError(0, 'network', 'Failed to fetch'), t)).toBe('t:common.networkError')
  })

  it('sanitizes JVM connection chains from chat/LLM failures', () => {
    expect(
      errorText(new ApiError(500, 'error', 'ConnectException <- ClosedChannelException'), t),
    ).toBe('t:common.llmUnavailable')
  })

  it('keeps the server-provided message for real API errors', () => {
    expect(errorText(new ApiError(500, 'internal_error', 'boom'), t)).toBe('boom')
  })

  it('falls back to the message of any Error', () => {
    expect(errorText(new Error('kaboom'), t)).toBe('kaboom')
  })

  it('stringifies non-Error throwables', () => {
    expect(errorText('nope', t)).toBe('nope')
  })
})
