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
  setOutputFolder: (folder) => ipcRenderer.invoke('set-output-folder', folder),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  listClips: () => ipcRenderer.invoke('list-clips'),
  // Which account is logged in: new clips are recorded as theirs and only theirs are listed
  setCurrentUser: (userId) => ipcRenderer.invoke('set-current-user', userId),
  onOutputFolderMissing: (callback) => ipcRenderer.on('output-folder-missing', callback),

  // Google sign-in: opens the browser, resolves with { success, code } once it redirects back
  googleSignIn: (authUrl) => ipcRenderer.invoke('google-sign-in', authUrl),
  cancelGoogleSignIn: () => ipcRenderer.invoke('cancel-google-sign-in'),

  // Onboarding
  getOnboardingStatus: (userId) => ipcRenderer.invoke('get-onboarding-status', userId),
  completeOnboarding: (userId) => ipcRenderer.invoke('complete-onboarding', userId),

  // File system
  openFileDirectory: (targetPath) => ipcRenderer.send('open-file-directory', targetPath),

  exportClip: (finalPath, destFolder, newName) => ipcRenderer.invoke('export-clip', finalPath, destFolder, newName),

  getClipDuration: () => ipcRenderer.invoke('get-clip-duration'),

  setClipDuration: (seconds) => ipcRenderer.invoke('set-clip-duration', seconds),

  deleteAccount: (accessToken) => ipcRenderer.invoke('delete-account', accessToken),

  setAppReady: (ready) => ipcRenderer.send('set-app-ready', ready),

  onPipelineError: (callback) => ipcRenderer.on('pipeline-error', callback),

  deleteClips: (filePaths) => ipcRenderer.invoke('delete-clips', filePaths),

  renameClip: (oldPath, newName) => ipcRenderer.invoke('rename-clip', oldPath, newName)
})
