import { app, BrowserWindow, Menu, globalShortcut, shell, ipcMain, dialog, session, protocol } from 'electron'
import path from 'node:path'
import fs, { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { spawn } from 'node:child_process'
import started from 'electron-squirrel-startup'
import Store from 'electron-store'
import { OBSWebSocket } from 'obs-websocket-js'
import { createClipOwnership, forgetAccount } from './main/clipOwnership'
import { listOwnedClips, exportClip, renameClip, deleteClips } from './main/clipLibrary'
import { createStageReader } from './main/pipelineOutput'
import { createOAuthLoopback } from './main/oauthLoopback'
import { pipelineCommand } from './main/pipelineCommand'

/* global MAIN_WINDOW_VITE_DEV_SERVER_URL, MAIN_WINDOW_VITE_NAME */

// Vite replaces import.meta.env.VITE_* with the values from .env.local at build time,
// so the packaged app has them without shipping the .env file
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

protocol.registerSchemesAsPrivileged([
  { scheme: 'clip', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

// The installer starts the app briefly to make shortcuts; it should quit straight away
if (started) app.quit()

// Only one copy at a time: a second one would fight over the hotkey and the sign-in
// port, so opening the app again just brings the open window to the front
if (!started && !app.requestSingleInstanceLock()) app.quit()

app.on('second-instance', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

// ── Persistent config store ───────────────────────────────────────────────────
const store = new Store({
  defaults: {
    hotkey: 'F5',
    outputFolder: '',
    obsConnected: false,
    onboardingComplete: {},
    clipDuration: 60,
    clipOwners: {} // clip path → id of the account that made it
  }
})

// One-time migration: earlier builds stored onboardingComplete as a flat boolean
if (typeof store.get('onboardingComplete') !== 'object' || store.get('onboardingComplete') === null) {
  store.set('onboardingComplete', {})
}

// ── Clip ownership ────────────────────────────────────────────────────────────
// Each clip is recorded against the account that made it (see main/clipOwnership.js)
const clipOwnership = createClipOwnership(store)
let currentUserId = null // set by the dashboard while someone is logged in

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
    return { success: false, error: err.message, code: err.code }
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

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }

  // Developer tools only open while developing
  if (!app.isPackaged) mainWindow.webContents.openDevTools()
}

// ── ML pipeline runner ────────────────────────────────────────────────────────
const DEFAULT_FACECAM = '384:216:0:0'

// ownerId: the account that pressed the hotkey (they own the clip even if they log out mid-run)
function runProcessingPipeline (videoPath, ownerId) {
  const outputFolder = store.get('outputFolder') || ''
  const { command, args, env } = pipelineCommand({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    appPath: app.getAppPath()
  })
  const python = spawn(command, [...args, videoPath, DEFAULT_FACECAM, outputFolder], {
    env,
    windowsHide: true // no console window popping up over the game
  })
  currentPythonProcess = python

  const reader = createStageReader((event) => {
    if (event.type === 'done') {
      isProcessing = false
      clipOwnership.setOwner(event.path, ownerId) // before telling the dashboard, so the reload lists it
      mainWindow.webContents.send('stage-update', { status: 'completed', path: event.path })
    } else if (event.type === 'error') {
      isProcessing = false
      mainWindow.webContents.send('pipeline-error', event.message)
      mainWindow.webContents.send('stage-update', null)
    } else {
      mainWindow.webContents.send('stage-update', event.stage)
    }
  })
  cancelCurrentRun = () => reader.cancel()

  // Decode as UTF-8 here so a character split across two chunks isn't garbled
  python.stdout.setEncoding('utf8')
  python.stdout.on('data', (chunk) => reader.push(chunk))

  python.stderr.on('data', (data) => {
    console.error('Python error:', data.toString())
  })

  // e.g. Python isn't installed: 'close' still follows and reports it as an error
  python.on('error', (err) => console.error('Could not start the clip pipeline:', err.message))

  python.on('close', (code) => {
    console.log(`Python process exited with code ${code}`)
    reader.end(code)
    if (currentPythonProcess === python) currentPythonProcess = null
  })
}

let appReady = false
let currentPythonProcess = null
let cancelCurrentRun = null
let isProcessing = false

// ── Hotkey registration ───────────────────────────────────────────────────────
// Returns false if the key can't be used as a global shortcut (invalid, or taken by
// another app). While onboarding or the settings dialog is open (appReady false) the
// shortcut is switched off again, because a registered global shortcut swallows the
// key press and the hotkey picker could never see it.
function registerHotkey (key) {
  globalShortcut.unregisterAll()

  let ok = false
  try {
    ok = globalShortcut.register(key, async () => {
      if (!appReady) return

      if (isProcessing) {
        // Pressing the hotkey again cancels the clip that's being made
        cancelCurrentRun?.()
        if (currentPythonProcess) currentPythonProcess.kill()
        isProcessing = false
        mainWindow.webContents.send('stage-update', null)
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
      const ownerId = currentUserId
      mainWindow.webContents.send('stage-update', 'clipping')

      try {
        const replayPath = await saveReplayBuffer()
        console.log('Replay saved to:', replayPath)
        runProcessingPipeline(replayPath, ownerId)
      } catch (err) {
        isProcessing = false
        console.error('Replay buffer error:', err.message)
        mainWindow.webContents.send('obs-error', err.message)
        mainWindow.webContents.send('stage-update', null)
      }
    })
  } catch {
    ok = false // invalid accelerator string
  }

  if (!appReady) globalShortcut.unregisterAll()
  return ok
}

// ── Google sign-in (OAuth with PKCE) ───────────────────────────────────────────
// The browser finishes sign-in and is sent back to a local server (main/oauthLoopback.js)
const oauth = createOAuthLoopback({
  port: 54500,
  callbackPath: '/auth/callback',
  timeoutMs: 3 * 60 * 1000,
  openExternal: (url) => shell.openExternal(url),
  onCallback: () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // The File/Edit/View menu is only useful while developing
  if (app.isPackaged) Menu.setApplicationMenu(null)

  // Clip previews can go full screen; anything else a page asks for (camera,
  // microphone, location, ...) the app never needs, so it's refused
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'fullscreen')
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
    const previousKey = store.get('hotkey')
    if (!registerHotkey(newKey)) {
      registerHotkey(previousKey) // keep the old shortcut working
      return { success: false, error: `globalShortcut.register("${newKey}") failed` }
    }
    store.set('hotkey', newKey)
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

  // Folder picker that doesn't change any setting (export destination, settings draft)
  ipcMain.handle('pick-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return { success: false }
    return { success: true, path: result.filePaths[0] }
  })

  ipcMain.handle('set-output-folder', (event, folder) => {
    if (!folder || !fs.existsSync(folder)) return { success: false, error: 'That folder doesn\'t exist.' }
    store.set('outputFolder', folder)
    return { success: true, path: folder }
  })

  ipcMain.handle('set-current-user', (event, userId) => {
    currentUserId = userId || null
  })

  // The logged-in account's clips in the output folder, newest first
  ipcMain.handle('list-clips', () => listOwnedClips(store.get('outputFolder'), clipOwnership, currentUserId))

  ipcMain.handle('export-clip', (event, finalPath, destFolder, newName) => exportClip(finalPath, destFolder, newName, clipOwnership))

  ipcMain.handle('delete-clips', (event, filePaths) => deleteClips(filePaths, clipOwnership))

  ipcMain.handle('rename-clip', (event, oldPath, newName) => renameClip(oldPath, newName, clipOwnership))

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
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (!res.ok) throw new Error(await res.text())

      forgetAccount(store, currentUserId)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('google-sign-in', async (event, authUrl) => {
    try {
      // Only ever open our own Supabase project's auth URL in the browser
      if (new URL(authUrl).origin !== new URL(SUPABASE_URL).origin) {
        throw new Error('Unexpected sign-in URL.')
      }
      const code = await oauth.wait(authUrl)
      return { success: true, code }
    } catch (err) {
      return { success: false, error: err.message, cancelled: Boolean(err.cancelled) }
    }
  })

  ipcMain.handle('cancel-google-sign-in', () => oauth.cancel())

  ipcMain.on('open-file-directory', (event, targetPath) => {
    if (targetPath) shell.showItemInFolder(targetPath)
  })

  ipcMain.on('set-app-ready', (event, ready) => {
    appReady = ready
    if (ready) registerHotkey(store.get('hotkey'))
    else globalShortcut.unregisterAll()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (obsConnected) obs.disconnect()
  currentPythonProcess?.kill() // don't leave a clip half-made in the background
})
