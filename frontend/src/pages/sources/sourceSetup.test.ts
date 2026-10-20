import { describe, expect, it } from 'vitest'
import { ApiError, CLI_SETUP_SOURCE_TYPES } from '../../lib/api'
import { isSetupInstallConflict } from './sourceSetupUi'

describe('isSetupInstallConflict', () => {
  it('detects setup_busy / conflict 409', () => {
    expect(isSetupInstallConflict(new ApiError(409, 'setup_busy', 'busy'))).toBe(true)
    expect(isSetupInstallConflict(new ApiError(409, 'conflict', 'busy'))).toBe(true)
    expect(isSetupInstallConflict(new ApiError(400, 'setup_busy', 'busy'))).toBe(false)
  })
})

describe('CLI_SETUP_SOURCE_TYPES', () => {
  it('covers the three OSS CLI connectors only', () => {
    expect(CLI_SETUP_SOURCE_TYPES.has('ZHIHU')).toBe(true)
    expect(CLI_SETUP_SOURCE_TYPES.has('WEIBO')).toBe(true)
    expect(CLI_SETUP_SOURCE_TYPES.has('BILIBILI')).toBe(true)
    expect(CLI_SETUP_SOURCE_TYPES.has('RSS')).toBe(false)
    expect(CLI_SETUP_SOURCE_TYPES.has('DAILY_HOT')).toBe(false)
  })
})
