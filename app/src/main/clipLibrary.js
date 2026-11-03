import fs from 'node:fs'
import path from 'node:path'

// File operations behind the dashboard's clip list, export, rename and delete.
// `ownership` is the object from createClipOwnership().

export const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.webm'])

// Names Windows refuses for any file, whatever the extension
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

// Makes a user-typed name safe to use as a file name: drops characters Windows doesn't
// allow (which also stops "../" tricks) and the trailing dots/spaces Windows strips.
export function sanitizeFileName (name) {
  const cleaned = (name || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/[\s.]+$/, '')
    .trim()
  return RESERVED_NAMES.test(cleaned) ? `_${cleaned}` : cleaned
}

// The given account's clips in `folder`, newest first
export async function listOwnedClips (folder, ownership, userId) {
  if (!userId || !folder || !fs.existsSync(folder)) return []
  const entries = await fs.promises.readdir(folder, { withFileTypes: true })
  const clips = await Promise.all(entries
    .filter(entry => entry.isFile() && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map(entry => path.join(folder, entry.name))
    .filter(filePath => ownership.ownerOf(filePath) === userId)
    .map(async filePath => {
      try {
        const info = await fs.promises.stat(filePath)
        return { path: filePath, name: path.basename(filePath), size: info.size, createdAt: info.birthtimeMs || info.mtimeMs }
      } catch {
        return null // deleted between listing the folder and reading it
      }
    }))
  return clips.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt)
}

// Copies a clip into another folder, optionally under a new name. Never overwrites.
export async function exportClip (finalPath, destFolder, newName, ownership) {
  try {
    const safeName = sanitizeFileName(newName)
    const dest = path.join(destFolder, safeName ? `${safeName}${path.extname(finalPath)}` : path.basename(finalPath))
    await fs.promises.copyFile(finalPath, dest, fs.constants.COPYFILE_EXCL)
    ownership.setOwner(dest, ownership.ownerOf(finalPath)) // the copy belongs to the same account
    return { success: true, path: dest }
  } catch (err) {
    const error = err.code === 'EEXIST' ? 'A file with that name already exists in that folder.' : err.message
    return { success: false, error }
  }
}

// Renames a clip in place. Refuses to replace a different file that already has the name.
export async function renameClip (oldPath, newName, ownership) {
  const safeName = sanitizeFileName(newName)
  if (!safeName) return { success: false, error: 'Please enter a name for the clip.' }

  const newPath = path.join(path.dirname(oldPath), `${safeName}${path.extname(oldPath)}`)
  const sameFile = ownership.key(newPath) === ownership.key(oldPath) // e.g. only the letter case changed
  if (!sameFile && fs.existsSync(newPath)) {
    return { success: false, error: 'A clip with that name already exists.' }
  }

  try {
    await fs.promises.rename(oldPath, newPath)
    ownership.move(oldPath, newPath)
    return { success: true, path: newPath }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export async function deleteClips (filePaths, ownership) {
  const results = []
  for (const filePath of filePaths) {
    try {
      await fs.promises.unlink(filePath)
      ownership.forget(filePath)
      results.push({ path: filePath, success: true })
    } catch (err) {
      results.push({ path: filePath, success: false, error: err.message })
    }
  }
  return results
}
