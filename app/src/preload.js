import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Pipeline stage updates
  onStageUpdate: (callback) => ipcRenderer.on('stage-update', callback),

  // OBS error events
  onObsError: (callback) => ipcRenderer.on('obs-error', callback),

  // OBS connection
  connectOBS: () => ipcRenderer.invoke('connect-obs'),
  getObsStatus: () => ipcRenderer.invoke('get-obs-status'),

  // Hotkey management
  setHotkey: (key) => ipcRenderer.invoke('set-hotkey', key),
  getHotkey: () => ipcRenderer.invoke('get-hotkey'),

  // Output folder
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  getOutputFolder: () => ipcRenderer.invoke('get-output-folder'),

  // Onboarding
  getOnboardingStatus: () => ipcRenderer.invoke('get-onboarding-status'),
  completeOnboarding: () => ipcRenderer.invoke('complete-onboarding'),

  // File system
  openFileDirectory: (targetPath) => ipcRenderer.send('open-file-directory', targetPath),
})