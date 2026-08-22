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
  onOutputFolderMissing: (callback) => ipcRenderer.on('output-folder-missing', callback),

  // Onboarding
  getOnboardingStatus: () => ipcRenderer.invoke('get-onboarding-status'),
  completeOnboarding: () => ipcRenderer.invoke('complete-onboarding'),

  // File system
  openFileDirectory: (targetPath) => ipcRenderer.send('open-file-directory', targetPath),
  
  exportClip: (finalPath, destFolder) => ipcRenderer.invoke('export-clip', finalPath, destFolder),

  getClipDuration: () => ipcRenderer.invoke('get-clip-duration'),

  setClipDuration: (seconds) => ipcRenderer.invoke('set-clip-duration', seconds),
  
  deleteAccount: (accessToken) => ipcRenderer.invoke('delete-account', accessToken),

  setAppReady: (ready) => ipcRenderer.send('set-app-ready', ready),

  onPipelineError: (callback) => ipcRenderer.on('pipeline-error', callback),

  deleteClips: (filePaths) => ipcRenderer.invoke('delete-clips', filePaths),

  renameClip: (oldPath, newName) => ipcRenderer.invoke('rename-clip', oldPath, newName)
})