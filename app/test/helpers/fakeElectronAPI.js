import { vi } from 'vitest'

// Installs a fake window.electronAPI (what preload.js exposes) with sensible defaults.
// Event subscriptions (onObsError, onStageUpdate, ...) store their callback so a test
// can fire the event with api.emit('obs-error', 'message').
export function installElectronAPI (overrides = {}) {
  const listeners = {}
  const on = (channel) => vi.fn((callback) => { listeners[channel] = callback })

  const api = {
    onStageUpdate: on('stage-update'),
    onObsError: on('obs-error'),
    onPipelineError: on('pipeline-error'),
    onOutputFolderMissing: on('output-folder-missing'),
    connectOBS: vi.fn().mockResolvedValue({ success: true }),
    getObsStatus: vi.fn().mockResolvedValue({ connected: true }),
    setHotkey: vi.fn().mockResolvedValue({ success: true }),
    getHotkey: vi.fn().mockResolvedValue('F5'),
    selectOutputFolder: vi.fn().mockResolvedValue({ success: true, path: 'C:\\Clips' }),
    getOutputFolder: vi.fn().mockResolvedValue('C:\\Clips'),
    setOutputFolder: vi.fn().mockResolvedValue({ success: true }),
    pickFolder: vi.fn().mockResolvedValue({ success: true, path: 'D:\\Exports' }),
    listClips: vi.fn().mockResolvedValue([]),
    setCurrentUser: vi.fn().mockResolvedValue(undefined),
    googleSignIn: vi.fn().mockResolvedValue({ success: true, code: 'oauth-code' }),
    cancelGoogleSignIn: vi.fn().mockResolvedValue(undefined),
    getOnboardingStatus: vi.fn().mockResolvedValue({ complete: true }),
    completeOnboarding: vi.fn().mockResolvedValue({ success: true }),
    openFileDirectory: vi.fn(),
    exportClip: vi.fn().mockResolvedValue({ success: true }),
    getClipDuration: vi.fn().mockResolvedValue(60),
    setClipDuration: vi.fn().mockResolvedValue({ success: true }),
    deleteAccount: vi.fn().mockResolvedValue({ success: true }),
    setAppReady: vi.fn(),
    deleteClips: vi.fn().mockResolvedValue([]),
    renameClip: vi.fn().mockResolvedValue({ success: true }),
    ...overrides
  }

  api.emit = (channel, payload) => listeners[channel]?.({}, payload)
  window.electronAPI = api
  return api
}

// A clip as main.js's list-clips returns it
export function makeClip (name, { minutesAgo = 5, size = 29e6, folder = 'C:\\Clips' } = {}) {
  return { path: `${folder}\\${name}`, name, size, createdAt: Date.now() - minutesAgo * 60000 }
}
