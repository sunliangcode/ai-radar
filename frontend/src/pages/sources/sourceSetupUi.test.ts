import { describe, expect, it } from 'vitest'
import {
  localizedSetupHint,
  SETUP_INSTALL_PHASES,
  setupChipClass,
  setupListRowActions,
  setupStateLabelKey,
} from './sourceSetupUi'

describe('sourceSetupUi', () => {
  it('maps setup states to label keys', () => {
    expect(setupStateLabelKey('ready')).toBe('sources.setup.stateReady')
    expect(setupStateLabelKey('need_cookie')).toBe('sources.setup.stateNeedCookie')
    expect(setupStateLabelKey('unknown')).toBeNull()
  })

  it('assigns distinct chip tones per state', () => {
    expect(setupChipClass('ready')).toContain('moss')
    expect(setupChipClass('need_cookie')).toContain('amber')
    expect(setupChipClass('unreachable')).toContain('red')
  })

  it('gates list Install vs Configure Cookie from installAvailable', () => {
    expect(
      setupListRowActions(
        {
          supported: true,
          state: 'cli_missing',
          installAvailable: true,
          cliPath: '',
          reason: '',
          openSourceUrl: '',
        },
        true,
      ).showInstall,
    ).toBe(true)
    expect(
      setupListRowActions(
        {
          supported: true,
          state: 'need_cookie',
          installAvailable: false,
          cliPath: '/x',
          reason: '',
          openSourceUrl: '',
        },
        true,
      ).showCookieSetup,
    ).toBe(true)
  })

  it('covers install phase steps for wizard progress', () => {
    expect(SETUP_INSTALL_PHASES).toEqual(['package', 'clone', 'build', 'resolve', 'probe'])
  })

  it('prefers hintCode i18n over raw reason', () => {
    const t = (key: string) =>
      key === 'sources.setup.hints.setup_need_cookie' ? 'Need login' : key
    expect(
      localizedSetupHint({ hintCode: 'setup_need_cookie', reason: 'raw' }, t),
    ).toBe('Need login')
  })
})
