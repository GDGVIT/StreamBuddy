// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { pipelineCommand } from '../../src/main/pipelineCommand'

const INSTALLED = {
  isPackaged: true,
  resourcesPath: 'C:\\Users\\Sam\\AppData\\Local\\streambuddy\\app-1.0.0\\resources',
  appPath: 'C:\\Users\\Sam\\AppData\\Local\\streambuddy\\app-1.0.0\\resources\\app.asar',
  platform: 'win32',
  env: { Path: 'C:\\Windows\\system32;C:\\Windows', USERPROFILE: 'C:\\Users\\Sam' }
}

describe('while developing', () => {
  const dev = {
    isPackaged: false,
    resourcesPath: 'C:\\StreamBuddy\\app\\node_modules\\electron\\dist\\resources',
    appPath: 'C:\\StreamBuddy\\app',
    platform: 'win32',
    env: { Path: 'C:\\StreamBuddy\\ml\\venv\\Scripts;C:\\Windows' }
  }

  it('runs pipeline.py from the ml folder with the Python on PATH', () => {
    const { command, args } = pipelineCommand(dev)
    expect(command).toBe('python')
    expect(args).toEqual(['C:\\StreamBuddy\\ml\\pipeline.py'])
  })

  it('leaves PATH and the model folder alone', () => {
    const { env } = pipelineCommand(dev)
    expect(env.Path).toBe(dev.env.Path)
    expect(env).not.toHaveProperty('STREAMBUDDY_WHISPER_DIR')
  })
})

describe('in the installed app', () => {
  it('runs the standalone pipeline from the resources folder', () => {
    const { command, args } = pipelineCommand(INSTALLED)
    expect(command).toBe(`${INSTALLED.resourcesPath}\\pipeline\\pipeline.exe`)
    expect(args).toEqual([])
  })

  it('puts the bundled ffmpeg first on the existing Path', () => {
    const { env } = pipelineCommand(INSTALLED)
    expect(env.Path).toBe(`${INSTALLED.resourcesPath}\\ffmpeg;C:\\Windows\\system32;C:\\Windows`)
    expect(env).not.toHaveProperty('PATH') // a second spelling would be ambiguous
  })

  it('points Whisper at the bundled model', () => {
    expect(pipelineCommand(INSTALLED).env.STREAMBUDDY_WHISPER_DIR).toBe(`${INSTALLED.resourcesPath}\\whisper`)
  })

  it('keeps the rest of the environment', () => {
    expect(pipelineCommand(INSTALLED).env.USERPROFILE).toBe('C:\\Users\\Sam')
  })

  it('copes with no PATH at all', () => {
    const { env } = pipelineCommand({ ...INSTALLED, env: {} })
    expect(env.PATH).toBe(`${INSTALLED.resourcesPath}\\ffmpeg`)
  })

  it('uses the right names and separators on Linux and macOS', () => {
    const { command, env } = pipelineCommand({ ...INSTALLED, platform: 'linux', resourcesPath: '/opt/StreamBuddy/resources', env: { PATH: '/usr/bin' } })
    expect(command).toBe('/opt/StreamBuddy/resources/pipeline/pipeline')
    expect(env.PATH).toBe('/opt/StreamBuddy/resources/ffmpeg:/usr/bin')
  })
})

it('always asks Python for UTF-8 output', () => {
  expect(pipelineCommand(INSTALLED).env.PYTHONIOENCODING).toBe('utf-8')
  expect(pipelineCommand({ ...INSTALLED, isPackaged: false }).env.PYTHONIOENCODING).toBe('utf-8')
})
