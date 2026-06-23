/* global MAIN_WINDOW_VITE_DEV_SERVER_URL, MAIN_WINDOW_VITE_NAME */
import { app, BrowserWindow, globalShortcut } from 'electron'
import path from 'node:path'
import { spawn } from 'node:child_process'
import started from 'electron-squirrel-startup'

if (started) {
  app.quit()
}

let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }

  mainWindow.webContents.openDevTools()
}

// app.getAppPath() always resolves to the app root (StreamBuddy/app/)
// regardless of whether we're in dev or production — safer than __dirname
const APP_ROOT = app.getAppPath()

// ml/ sits one level above app/ in the StreamBuddy root
const ML_ROOT = path.join(APP_ROOT, '../ml')

const PIPELINE_SCRIPT = path.join(ML_ROOT, 'pipeline.py')

// The video file to process — later this will come from OBS via monitor.py
// For now hardcoded for testing; replace with dynamic path when ready
const TEST_VIDEO_PATH = path.join(ML_ROOT, 'examples/test.mp4')

function runProcessingPipeline (videoPath) {
  const python = spawn('python', [PIPELINE_SCRIPT, videoPath])

  // Read stdout line by line and forward STAGE: messages to the renderer
  python.stdout.on('data', (data) => {
    const lines = data.toString().split('\n')
    lines.forEach(line => {
      line = line.trim()
      if (line.startsWith('STAGE:')) {
        const stageRaw = line.replace('STAGE:', '')

        if (stageRaw.startsWith('DONE:')) {
          // Pipeline finished — clear the processing indicator
          mainWindow.webContents.send('stage-update', null)
        } else {
          // Map Python stage names to what the Dashboard expects
          const stageMap = {
            TRANSCRIBING: 'transcribing',
            FINALIZING: 'finalising'
          }
          const stage = stageMap[stageRaw] || stageRaw.toLowerCase()
          mainWindow.webContents.send('stage-update', stage)
        }
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

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  globalShortcut.register('F5', () => {
    // Send 'clipping' immediately on hotkey press
    mainWindow.webContents.send('stage-update', 'clipping')

    // Then kick off the real Python pipeline
    // TODO: replace TEST_VIDEO_PATH with the actual OBS output path
    runProcessingPipeline(TEST_VIDEO_PATH)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
