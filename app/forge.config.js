const { FusesPlugin } = require('@electron-forge/plugin-fuses')
const { FuseV1Options, FuseVersion } = require('@electron/fuses')

module.exports = {
  packagerConfig: {
    asar: true,
    icon: 'assets/icon', // Forge adds .ico on Windows
    // Built by ml/build_pipeline.py; they end up in the installed app's resources folder,
    // where main/pipelineCommand.js looks for them
    extraResource: ['bundle/pipeline', 'bundle/ffmpeg', 'bundle/whisper'],
    win32metadata: {
      CompanyName: 'StreamBuddy',
      FileDescription: 'StreamBuddy',
      ProductName: 'StreamBuddy'
    }
  },
  rebuildConfig: {},
  makers: [
    {
      // A one-click installer like Discord's: installs for the current user (no admin
      // prompt), adds Start menu and desktop shortcuts, and opens the app when done
      name: '@electron-forge/maker-squirrel',
      config: {
        setupExe: 'StreamBuddy-Setup.exe',
        setupIcon: 'assets/icon.ico',
        loadingGif: 'assets/installing.gif', // shown while it installs
        // The icon shown in Settings → Apps; Windows downloads it, so it must be a URL
        iconUrl: 'https://raw.githubusercontent.com/GDGVIT/StreamBuddy/dev/app/assets/icon.ico',
        noMsi: true
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: 'src/main.js',
            config: 'vite.main.config.mjs',
            target: 'main'
          },
          {
            entry: 'src/preload.js',
            config: 'vite.preload.config.mjs',
            target: 'preload'
          }
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs'
          }
        ]
      }
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
    })
  ]
}
