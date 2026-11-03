// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createClipOwnership } from '../../src/main/clipOwnership'
import { deleteClips, exportClip, listOwnedClips, renameClip, sanitizeFileName } from '../../src/main/clipLibrary'
import { createMemoryStore } from '../helpers/memoryStore'

let tmp, clips, exports, owners

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sb-clips-'))
  clips = path.join(tmp, 'Clips')
  exports = path.join(tmp, 'Exports')
  fs.mkdirSync(clips)
  fs.mkdirSync(exports)
  owners = createClipOwnership(createMemoryStore({ clipOwners: {} }))
})

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
})

// Creates a file in the clips folder, optionally owned by an account
function addClip (name, owner, contents = 'video') {
  const filePath = path.join(clips, name)
  fs.writeFileSync(filePath, contents)
  if (owner) owners.setOwner(filePath, owner)
  return filePath
}

describe('sanitizeFileName', () => {
  it.each([
    ['my clip', 'my clip'],
    ['  padded  ', 'padded'],
    ['what?*:"<>|', 'what'],
    ['../../Windows/evil', '....Windowsevil'],
    ['trailing dots...', 'trailing dots'],
    ['CON', '_CON'],
    ['nul', '_nul'],
    ['', ''],
    [undefined, '']
  ])('%j → %j', (input, expected) => {
    expect(sanitizeFileName(input)).toBe(expected)
  })
})

describe('listOwnedClips', () => {
  it("lists only the logged-in account's videos", async () => {
    addClip('mine.mp4', 'alice')
    addClip('theirs.mp4', 'bob')
    addClip('obs-recording.mkv') // not made by StreamBuddy
    addClip('notes.txt', 'alice') // not a video
    fs.mkdirSync(path.join(clips, 'folder.mp4')) // a folder, not a file

    const list = await listOwnedClips(clips, owners, 'alice')
    expect(list.map(c => c.name)).toEqual(['mine.mp4'])
    expect(list[0]).toMatchObject({ path: path.join(clips, 'mine.mp4'), size: 5 })
  })

  it('accepts every video format OBS can record', async () => {
    for (const ext of ['mp4', 'MOV', 'mkv', 'webm']) addClip(`clip.${ext}`, 'alice')
    expect(await listOwnedClips(clips, owners, 'alice')).toHaveLength(4)
  })

  it('sorts newest first', async () => {
    const old = addClip('old.mp4', 'alice')
    const fresh = addClip('new.mp4', 'alice')
    fs.utimesSync(old, new Date('2026-01-01'), new Date('2026-01-01'))
    fs.utimesSync(fresh, new Date('2026-06-01'), new Date('2026-06-01'))
    const list = await listOwnedClips(clips, owners, 'alice')
    expect(list[0].createdAt).toBeGreaterThanOrEqual(list[1].createdAt)
  })

  it('returns nothing when nobody is logged in or the folder is missing', async () => {
    addClip('mine.mp4', 'alice')
    expect(await listOwnedClips(clips, owners, null)).toEqual([])
    expect(await listOwnedClips('', owners, 'alice')).toEqual([])
    expect(await listOwnedClips(path.join(tmp, 'gone'), owners, 'alice')).toEqual([])
  })
})

describe('exportClip', () => {
  it('copies the clip under a new name and keeps the extension', async () => {
    const clip = addClip('polished_a.mp4', 'alice')
    const result = await exportClip(clip, exports, 'Best play', owners)
    expect(result).toEqual({ success: true, path: path.join(exports, 'Best play.mp4') })
    expect(fs.readFileSync(result.path, 'utf8')).toBe('video')
    expect(fs.existsSync(clip)).toBe(true) // a copy, not a move
  })

  it('keeps the original name when none is given', async () => {
    const clip = addClip('polished_a.mp4', 'alice')
    const result = await exportClip(clip, exports, undefined, owners)
    expect(result.path).toBe(path.join(exports, 'polished_a.mp4'))
  })

  it('never overwrites a file that already exists', async () => {
    const clip = addClip('polished_a.mp4', 'alice', 'new video')
    fs.writeFileSync(path.join(exports, 'taken.mp4'), 'keep me')
    const result = await exportClip(clip, exports, 'taken', owners)
    expect(result).toEqual({ success: false, error: 'A file with that name already exists in that folder.' })
    expect(fs.readFileSync(path.join(exports, 'taken.mp4'), 'utf8')).toBe('keep me')
  })

  it("can't be tricked into writing outside the chosen folder", async () => {
    const clip = addClip('polished_a.mp4', 'alice')
    const result = await exportClip(clip, exports, '../../escaped', owners)
    expect(path.dirname(result.path)).toBe(exports)
  })

  it('gives the copy to the same account, so it shows if exported into the clips folder', async () => {
    const clip = addClip('polished_a.mp4', 'alice')
    const result = await exportClip(clip, clips, 'copy', owners)
    expect(owners.ownerOf(result.path)).toBe('alice')
  })

  it('reports a missing source file', async () => {
    const result = await exportClip(path.join(clips, 'gone.mp4'), exports, 'x', owners)
    expect(result.success).toBe(false)
  })
})

describe('renameClip', () => {
  it('renames the file and keeps it on the same account', async () => {
    const clip = addClip('polished_a.mp4', 'alice')
    const result = await renameClip(clip, 'Clutch', owners)
    expect(result).toEqual({ success: true, path: path.join(clips, 'Clutch.mp4') })
    expect(fs.existsSync(clip)).toBe(false)
    expect(owners.ownerOf(result.path)).toBe('alice')
  })

  it("refuses to replace another clip, so that clip isn't destroyed", async () => {
    const clip = addClip('polished_a.mp4', 'alice', 'first')
    addClip('Clutch.mp4', 'alice', 'second')
    const result = await renameClip(clip, 'Clutch', owners)
    expect(result).toEqual({ success: false, error: 'A clip with that name already exists.' })
    expect(fs.readFileSync(path.join(clips, 'Clutch.mp4'), 'utf8')).toBe('second')
    expect(fs.existsSync(clip)).toBe(true)
  })

  it("can't move the clip out of its folder", async () => {
    const clip = addClip('polished_a.mp4', 'alice')
    const result = await renameClip(clip, '../outside', owners)
    expect(path.dirname(result.path)).toBe(clips)
  })

  it('rejects an empty name', async () => {
    const clip = addClip('polished_a.mp4', 'alice')
    expect(await renameClip(clip, '   ', owners)).toEqual({ success: false, error: 'Please enter a name for the clip.' })
  })
})

describe('deleteClips', () => {
  it('deletes the files and forgets them, reporting each result', async () => {
    const a = addClip('a.mp4', 'alice')
    const missing = path.join(clips, 'missing.mp4')
    const results = await deleteClips([a, missing], owners)
    expect(results[0]).toEqual({ path: a, success: true })
    expect(results[1]).toMatchObject({ path: missing, success: false })
    expect(fs.existsSync(a)).toBe(false)
    expect(owners.ownerOf(a)).toBeNull()
  })
})
