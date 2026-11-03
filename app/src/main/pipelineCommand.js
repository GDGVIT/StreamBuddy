import path from 'node:path'

// How to start the clip pipeline (the arguments for one clip are added by main.js).
//
// While developing (npm start) it's ml/pipeline.py, run by the Python on PATH, which
// is the ml venv. The installed app can't count on Python being there, so it runs the
// standalone build in its resources folder, with the ffmpeg and Whisper model that
// came with it (see ml/build_pipeline.py and forge.config.js).
export function pipelineCommand ({ isPackaged, resourcesPath, appPath, platform = process.platform, env = process.env }) {
  const p = platform === 'win32' ? path.win32 : path.posix
  // Windows pipes default to the old code page, which can't print every character a
  // transcript might contain, so Python is told to use UTF-8
  const baseEnv = { ...env, PYTHONIOENCODING: 'utf-8' }

  if (!isPackaged) {
    return { command: 'python', args: [p.join(appPath, '..', 'ml', 'pipeline.py')], env: baseEnv }
  }

  // Put the bundled ffmpeg first on PATH, so Whisper and the pipeline use it.
  // Windows usually spells the variable "Path"; change that one rather than add a second.
  const pathKey = Object.keys(env).find(key => key.toUpperCase() === 'PATH') || 'PATH'
  const ffmpegDir = p.join(resourcesPath, 'ffmpeg')

  return {
    command: p.join(resourcesPath, 'pipeline', platform === 'win32' ? 'pipeline.exe' : 'pipeline'),
    args: [],
    env: {
      ...baseEnv,
      [pathKey]: env[pathKey] ? ffmpegDir + p.delimiter + env[pathKey] : ffmpegDir,
      STREAMBUDDY_WHISPER_DIR: p.join(resourcesPath, 'whisper')
    }
  }
}
