/* global MAIN_WINDOW_VITE_DEV_SERVER_URL, MAIN_WINDOW_VITE_NAME */
/* eslint-disable n/no-callback-literal */
import { app, BrowserWindow, globalShortcut, shell, ipcMain, dialog, session } from 'electron'
import path from 'node:path'
import { spawn } from 'node:child_process'
import started from 'electron-squirrel-startup'
import Store from 'electron-store'
import { OBSWebSocket } from 'obs-websocket-js'

if (started) app.quit()

// Fix DNS resolution and network issues in Electron dev mode
app.commandLine.appendSwitch('disable-web-security')
app.commandLine.appendSwitch('ignore-certificate-errors')
app.commandLine.appendSwitch('allow-insecure-localhost', 'true')
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors,BlockInsecurePrivateNetworkRequests')

// ── Persistent config store ───────────────────────────────────────────────────
const store = new Store({
  defaults: {
    hotkey: 'F5',
    outputFolder: '',
    obsConnected: false,
    onboardingComplete: false
  }
})

// ── OBS WebSocket client ──────────────────────────────────────────────────────
const obs = new OBSWebSocket()
let obsConnected = false

async function connectToOBS () {
  try {
    await obs.connect('ws://127.0.0.1:4455')
    obsConnected = true
    store.set('obsConnected', true)

    // Auto-start replay buffer if it isn't already running
    const { outputActive } = await obs.call('GetReplayBufferStatus')
    if (!outputActive) {
      await obs.call('StartReplayBuffer')
    }

    console.log('OBS WebSocket connected, replay buffer active')
    return { success: true }
  } catch (err) {
    obsConnected = false
    store.set('obsConnected', false)
    console.error('OBS connection failed:', JSON.stringify(err), err)
    return { success: false, error: err.message }
  }
}

// Save the OBS replay buffer and return the file path
async function saveReplayBuffer () {
  if (!obsConnected) {
    throw new Error('OBS is not connected')
  }
  try {
    await obs.call('SaveReplayBuffer')

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting for OBS replay buffer save'))
      }, 15000)

      obs.once('ReplayBufferSaved', (data) => {
        clearTimeout(timeout)
        resolve(data.savedReplayPath)
      })
    })
  } catch (err) {
    throw new Error(`Failed to save replay buffer: ${err.message}`)
  }
}

// ── Electron window ───────────────────────────────────────────────────────────
let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Allow all requests through — fixes Supabase ERR_NAME_NOT_RESOLVED in dev
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({
      requestHeaders: {
        ...details.requestHeaders,
        Origin: '*'
      }
    })
  })

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Headers': ['*']
      }
    })
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }

  mainWindow.webContents.openDevTools()
}

// ── ML pipeline runner ────────────────────────────────────────────────────────
const APP_ROOT = app.getAppPath()
const ML_ROOT = path.join(APP_ROOT, '../ml')
const PIPELINE_SCRIPT = path.join(ML_ROOT, 'pipeline.py')

function runProcessingPipeline (videoPath) {
  const python = spawn('python', [PIPELINE_SCRIPT, videoPath])

  python.stdout.on('data', (data) => {
    const lines = data.toString().split('\n')
    lines.forEach(line => {
      line = line.trim()
      if (!line.startsWith('STAGE:')) return

      const stageRaw = line.replace('STAGE:', '')

      if (stageRaw.startsWith('DONE:')) {
        const finalVideoPath = stageRaw.replace('DONE:', '')
        mainWindow.webContents.send('stage-update', { status: 'completed', path: finalVideoPath })
      } else {
        const stageMap = {
          TRANSCRIBING: 'transcribing',
          FINALIZING: 'finalising'
        }
        const stage = stageMap[stageRaw] || stageRaw.toLowerCase()
        mainWindow.webContents.send('stage-update', stage)
      }
    })
  })

  python.stderr.on('data', (data) => {
    console.error('Python error:', data.toString())
  })

  python.on('close', (code) => {
    console.log(`Python process exited with code ${code}`)
  })
}

// ── Hotkey registration ───────────────────────────────────────────────────────
function registerHotkey (key) {
  globalShortcut.unregisterAll()

  globalShortcut.register(key, async () => {
    if (!obsConnected) {
      mainWindow.webContents.send('obs-error', 'OBS is not connected. Please reconnect in settings.')
      return
    }

    mainWindow.webContents.send('stage-update', 'clipping')

    try {
      const replayPath = await saveReplayBuffer()
      console.log('Replay saved to:', replayPath)
      runProcessingPipeline(replayPath)
    } catch (err) {
      console.error('Replay buffer error:', err.message)
      mainWindow.webContents.send('obs-error', err.message)
      mainWindow.webContents.send('stage-update', null)
    }
  })
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Allow all network requests globally before window is created
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: details.requestHeaders })
  })

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true)
  })

  createWindow()

  if (store.get('obsConnected')) {
    await connectToOBS()
  }

  const savedHotkey = store.get('hotkey')
  registerHotkey(savedHotkey)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // ── IPC handlers ──────────────────────────────────────────────────────────

  ipcMain.handle('get-onboarding-status', () => ({
    complete: store.get('onboardingComplete'),
    hotkey: store.get('hotkey'),
    outputFolder: store.get('outputFolder'),
    obsConnected
  }))

  ipcMain.handle('connect-obs', async () => await connectToOBS())

  ipcMain.handle('get-obs-status', () => ({ connected: obsConnected }))

  ipcMain.handle('set-hotkey', (event, newKey) => {
    store.set('hotkey', newKey)
    registerHotkey(newKey)
    return { success: true, hotkey: newKey }
  })

  ipcMain.handle('get-hotkey', () => store.get('hotkey'))

  ipcMain.handle('select-output-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Output Folder for Clips'
    })
    if (!result.canceled && result.filePaths.length > 0) {
      store.set('outputFolder', result.filePaths[0])
      return { success: true, path: result.filePaths[0] }
    }
    return { success: false }
  })

  ipcMain.handle('get-output-folder', () => store.get('outputFolder'))

  ipcMain.handle('complete-onboarding', () => {
    store.set('onboardingComplete', true)
    return { success: true }
  })

  ipcMain.on('open-file-directory', (event, targetPath) => {
    if (targetPath) shell.showItemInFolder(targetPath)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (obsConnected) obs.disconnect()
})
