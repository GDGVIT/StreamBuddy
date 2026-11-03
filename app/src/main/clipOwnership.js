import path from 'node:path'

// Several accounts can share one PC and one output folder, so the app remembers which
// account made each clip (clip path → user id, kept in the settings store) and only
// lists that account's clips. Videos StreamBuddy didn't make belong to nobody.
export function createClipOwnership (store, { platform = process.platform } = {}) {
  const pathApi = platform === 'win32' ? path.win32 : path.posix

  // Windows paths are case-insensitive, so normalise before using one as a key
  function key (filePath) {
    const resolved = pathApi.resolve(filePath)
    return platform === 'win32' ? resolved.toLowerCase() : resolved
  }

  function owners () {
    return store.get('clipOwners') || {}
  }

  function ownerOf (filePath) {
    return owners()[key(filePath)] || null
  }

  function setOwner (filePath, userId) {
    if (!userId) return
    store.set('clipOwners', { ...owners(), [key(filePath)]: userId })
  }

  function forget (filePath) {
    const next = { ...owners() }
    delete next[key(filePath)]
    store.set('clipOwners', next)
  }

  // A renamed clip keeps its owner. Forget first, then set: on Windows a rename that
  // only changes letter case keeps the same key, and the other order would erase it.
  function move (fromPath, toPath) {
    const owner = ownerOf(fromPath)
    forget(fromPath)
    setOwner(toPath, owner)
  }

  return { key, ownerOf, setOwner, forget, move }
}

// Removes a deleted account's local records. Other accounts on this PC keep theirs; once
// no accounts are left, the shared settings (hotkey, folder, clip length) are reset too.
export function forgetAccount (store, userId) {
  const onboarding = { ...store.get('onboardingComplete') }
  delete onboarding[userId]
  const owners = Object.fromEntries(Object.entries(store.get('clipOwners') || {}).filter(([, owner]) => owner !== userId))

  if (Object.keys(onboarding).length === 0) {
    store.clear()
    return
  }
  store.set('onboardingComplete', onboarding)
  store.set('clipOwners', owners)
}
