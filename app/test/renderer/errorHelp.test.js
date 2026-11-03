import { describe, expect, it } from 'vitest'
import { explainError } from '../../src/components/errorHelp'

describe('explainError', () => {
  it.each([
    ['connect ECONNREFUSED 127.0.0.1:4455', 'obs', 'StreamBuddy can’t reach OBS'],
    ['1006 – Socket closed', 'obs', 'StreamBuddy can’t reach OBS'],
    ['4009 – Authentication failed', 'obs', 'OBS is asking for a password'],
    ['Replay buffer is not active', 'obs', 'Replay Buffer is turned off in OBS'],
    ['globalShortcut.register("F6") failed', 'hotkey', 'That key is already taken'],
    ['EPERM: operation not permitted, mkdir', 'folder', 'StreamBuddy isn’t allowed to save there'],
    ['ENOENT: no such file or directory', 'folder', 'That folder doesn’t exist anymore'],
    ['ENOSPC: no space left on device', 'folder', 'Your drive is full']
  ])('%s → %s', (details, context, title) => {
    expect(explainError(details, context).title).toBe(title)
  })

  it('checks the password problem before the generic connection one', () => {
    // An auth failure also mentions the socket; the password advice is the useful one
    expect(explainError('Socket closed with 4009: Authentication failed', 'obs').title).toBe('OBS is asking for a password')
  })

  it('falls back to advice for the step the user is on', () => {
    expect(explainError('', 'obs').title).toBe('StreamBuddy can’t reach OBS')
    expect(explainError(undefined, 'hotkey').title).toBe('That key is already taken')
    expect(explainError('something odd', 'folder').title).toBe('Something unexpected went wrong')
  })

  it('always gives at least one step to try', () => {
    for (const details of ['ECONNREFUSED', '4009', 'EPERM', '', 'weird']) {
      expect(explainError(details, 'folder').steps.length).toBeGreaterThan(0)
    }
  })
})
