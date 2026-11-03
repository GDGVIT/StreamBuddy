// Turns low-level error text (OBS socket errors, Node error codes, Electron messages)
// into a plain explanation plus steps a streamer can follow. The raw text is still
// shown underneath as "Technical details".

const OBS_UNREACHABLE = {
  title: 'StreamBuddy can’t reach OBS',
  steps: [
    'Make sure OBS Studio is open.',
    'In OBS, open Tools → WebSocket Server Settings and tick “Enable WebSocket server”.',
    'Check that the Server Port is 4455, then press Retry.'
  ]
}

const KEY_TAKEN = {
  title: 'That key is already taken',
  steps: [
    'Another app (Discord, Steam, your game or OBS itself) is already using it as a shortcut.',
    'Press Retry and pick a different key — F6–F10 or Insert usually work well.'
  ]
}

const SOMETHING_WENT_WRONG = {
  title: 'Something unexpected went wrong',
  steps: ['Try again.', 'If it keeps happening, restart OBS and StreamBuddy.']
}

// Checked in order; the first match wins
const RULES = [
  {
    test: /auth|4009|password/i,
    title: 'OBS is asking for a password',
    steps: [
      'In OBS, open Tools → WebSocket Server Settings.',
      'Untick “Enable Authentication” (StreamBuddy can’t send a password yet).',
      'Click Apply, then press Retry.'
    ]
  },
  {
    test: /replay ?buffer/i,
    title: 'Replay Buffer is turned off in OBS',
    steps: [
      'In OBS, open Settings → Output → Replay Buffer.',
      'Tick “Enable Replay Buffer” and click Apply.',
      'Press Retry.'
    ]
  },
  { test: /ECONNREFUSED|1006|websocket|socket|connect/i, ...OBS_UNREACHABLE },
  { test: /globalShortcut|register|accelerator/i, ...KEY_TAKEN },
  {
    test: /EPERM|EACCES|permission/i,
    title: 'StreamBuddy isn’t allowed to save there',
    steps: ['Pick a folder you own, like Videos or Documents.', 'Avoid system folders such as Program Files.']
  },
  {
    test: /ENOENT|does ?n.t exist|no such file/i,
    title: 'That folder doesn’t exist anymore',
    steps: ['It may have been moved, renamed or deleted.', 'Choose the folder again.']
  },
  {
    test: /ENOSPC/i,
    title: 'Your drive is full',
    steps: ['Free up some space, or choose a folder on another drive.']
  }
]

// What to say when the error text doesn't match anything, per onboarding step
const FALLBACKS = { obs: OBS_UNREACHABLE, hotkey: KEY_TAKEN }

export function explainError (details, context) {
  const text = details || ''
  return (text && RULES.find(rule => rule.test.test(text))) || FALLBACKS[context] || SOMETHING_WENT_WRONG
}
