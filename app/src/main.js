import { config } from 'dotenv'
import { app, BrowserWindow, globalShortcut, shell, ipcMain, dialog, session, protocol } from 'electron'
import path from 'node:path'
import fs, { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { spawn } from 'node:child_process'
import started from 'electron-squirrel-startup'
import Store from 'electron-store'
import { OBSWebSocket } from 'obs-websocket-js'

/* global MAIN_WINDOW_VITE_DEV_SERVER_URL, MAIN_WINDOW_VITE_NAME */

config({ path: '.env.local' })

protocol.registerSchemesAsPrivileged([
  { scheme: 'clip', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

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
    onboardingComplete: {},
    clipDuration: 60
  }
})

// One-time migration: earlier builds stored onboardingComplete as a flat boolean
if (typeof store.get('onboardingComplete') !== 'object' || store.get('onboardingComplete') === null) {
  store.set('onboardingComplete', {})
}

// ── OBS WebSocket client ──────────────────────────────────────────────────────
const obs = new OBSWebSocket()
let obsConnected = false

async function connectToOBS () {
  try {
    await obs.connect('ws://127.0.0.1:4455')
    obsConnected = true
    store.set('obsConnected', true)

    const savedDuration = store.get('clipDuration')

    await obs.call('SetProfileParameter', {
      parameterCategory: 'SimpleOutput',
      parameterName: 'RecRBTime',
      parameterValue: String(savedDuration)
    })

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
  // eslint-disable-next-line
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    // eslint-disable-next-line
    callback({
      requestHeaders: {
        ...details.requestHeaders,
        Origin: '*'
      }
    })
  })
  // eslint-disable-next-line
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    // eslint-disable-next-line
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

const DEFAULT_FACECAM = '384:216:0:0'

function runProcessingPipeline (videoPath) {
  const outputFolder = store.get('outputFolder') || ''
  currentPythonProcess = spawn('python', [PIPELINE_SCRIPT, videoPath, DEFAULT_FACECAM, outputFolder])
  const python = currentPythonProcess

  python.stdout.on('data', (data) => {
    const lines = data.toString().split('\n')
    lines.forEach(line => {
      line = line.trim()
      if (!line.startsWith('STAGE:')) return

      const stageRaw = line.replace('STAGE:', '')

      if (stageRaw.startsWith('DONE:')) {
        const finalVideoPath = stageRaw.replace('DONE:', '')
        isProcessing = false
        mainWindow.webContents.send('stage-update', { status: 'completed', path: finalVideoPath })
      } else if (stageRaw.startsWith('ERROR:')) {
        const errMsg = stageRaw.replace('ERROR:', '')
        isProcessing = false
        mainWindow.webContents.send('pipeline-error', errMsg)
        mainWindow.webContents.send('obs-error', errMsg)
        mainWindow.webContents.send('stage-update', null)
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

let appReady = false
let currentPythonProcess = null
let isProcessing = false

// ── Hotkey registration ───────────────────────────────────────────────────────
function registerHotkey (key) {
  globalShortcut.unregisterAll()

  globalShortcut.register(key, async () => {
    if (!appReady) return

    if (isProcessing) {
      // cancel: kill the running python process if you store its handle
      if (currentPythonProcess) currentPythonProcess.kill()
      isProcessing = false
      mainWindow.webContents.send('stage-update', null)

      // Clean up any partial artifacts left behind by the interrupted run
      const tempSrtPath = path.join(ML_ROOT, 'temp_subs.srt')
      if (fs.existsSync(tempSrtPath)) {
        fs.promises.unlink(tempSrtPath).catch(() => {})
      }
      return
    }

    if (!obsConnected) {
      mainWindow.webContents.send('obs-error', 'OBS is not connected. Please reconnect in settings.')
      return
    }

    const outputFolder = store.get('outputFolder')
    if (!outputFolder || !fs.existsSync(outputFolder)) {
      mainWindow.webContents.send('output-folder-missing')
      return
    }

    isProcessing = true
    mainWindow.webContents.send('stage-update', 'clipping')

    try {
      const replayPath = await saveReplayBuffer()
      console.log('Replay saved to:', replayPath)
      runProcessingPipeline(replayPath)
    } catch (err) {
      isProcessing = false
      console.error('Replay buffer error:', err.message)
      mainWindow.webContents.send('obs-error', err.message)
      mainWindow.webContents.send('stage-update', null)
    }
  })
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Allow all network requests globally before window is created

  // eslint-disable-next-line
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    // eslint-disable-next-line
    callback({ requestHeaders: details.requestHeaders })
  })

  // eslint-disable-next-line
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // eslint-disable-next-line
    callback(true)
  })

  protocol.handle('clip', async (request) => {
    const url = new URL(request.url)
    const filePath = decodeURIComponent(url.searchParams.get('path') || '')

    try {
      const stats = await stat(filePath)
      const stream = Readable.toWeb(createReadStream(filePath))

      return new Response(stream, {
        headers: {
          'content-type': 'video/mp4',
          'content-length': String(stats.size)
        }
      })
    } catch (err) {
      console.error('clip:// protocol error:', err.message)
      return new Response('Not found', { status: 404 })
    }
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

  ipcMain.handle('get-onboarding-status', (event, userId) => {
    let onboardingMap = store.get('onboardingComplete')
    if (typeof onboardingMap !== 'object' || onboardingMap === null) onboardingMap = {}
    return {
      complete: !!onboardingMap[userId],
      hotkey: store.get('hotkey'),
      outputFolder: store.get('outputFolder'),
      obsConnected
    }
  })

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

  ipcMain.handle('export-clip', async (event, finalPath, destFolder) => {
    try {
      const dest = path.join(destFolder, path.basename(finalPath))
      await fs.promises.copyFile(finalPath, dest)
      return { success: true, path: dest }
    } catch (err) {
      console.error('Export failed:', err.message)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('delete-clips', async (event, filePaths) => {
    const results = []
    for (const filePath of filePaths) {
      try {
        await fs.promises.unlink(filePath)
        results.push({ path: filePath, success: true })
      } catch (err) {
        results.push({ path: filePath, success: false, error: err.message })
      }
    }
    return results
  })

  ipcMain.handle('rename-clip', async (event, oldPath, newName) => {
    try {
      const dir = path.dirname(oldPath)
      const ext = path.extname(oldPath)
      const newPath = path.join(dir, `${newName}${ext}`)
      await fs.promises.rename(oldPath, newPath)
      return { success: true, path: newPath }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('complete-onboarding', (event, userId) => {
    let onboardingMap = store.get('onboardingComplete')
    if (typeof onboardingMap !== 'object' || onboardingMap === null) onboardingMap = {}
    onboardingMap[userId] = true
    store.set('onboardingComplete', onboardingMap)
    return { success: true }
  })

  ipcMain.handle('get-clip-duration', () => store.get('clipDuration'))

  ipcMain.handle('set-clip-duration', async (event, seconds) => {
    store.set('clipDuration', seconds)

    if (obsConnected) {
      try {
        await obs.call('SetProfileParameter', {
          parameterCategory: 'SimpleOutput',
          parameterName: 'RecRBTime',
          parameterValue: String(seconds)
        })

        const { outputActive } = await obs.call('GetReplayBufferStatus')

        if (outputActive) {
          await obs.call('StopReplayBuffer')
          await obs.call('StartReplayBuffer')
        }
      } catch (err) {
        console.error('Failed to update OBS replay duration:', err.message)
        return { success: false, error: err.message }
      }
    }

    return { success: true, clipDuration: seconds }
  })

  ipcMain.handle('delete-account', async (event, accessToken) => {
    try {
      const res = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (!res.ok) throw new Error(await res.text())

      store.clear() // wipe local hotkey/outputFolder/clipDuration/onboarding state
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.on('open-file-directory', (event, targetPath) => {
    if (targetPath) shell.showItemInFolder(targetPath)
  })

  ipcMain.on('set-app-ready', (event, ready) => {
    appReady = ready
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (obsConnected) obs.disconnect()
})
