import { describe, expect, it } from 'vitest'
import { ApiError } from '../lib/api'
import { isJobConflict } from './useFetchJobWithProgress'

describe('isJobConflict', () => {
  it('detects HTTP 409 ApiError', () => {
    expect(isJobConflict(new ApiError(409, 'conflict', 'fetch job already running'))).toBe(true)
  })

  it('rejects other statuses and plain errors', () => {
    expect(isJobConflict(new ApiError(500, 'error', 'boom'))).toBe(false)
    expect(isJobConflict(new Error('fetch job already running'))).toBe(false)
    expect(isJobConflict(null)).toBe(false)
  })
})
