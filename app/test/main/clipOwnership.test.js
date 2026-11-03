// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createClipOwnership, forgetAccount } from '../../src/main/clipOwnership'
import { createMemoryStore } from '../helpers/memoryStore'

function setup (platform = 'win32') {
  const store = createMemoryStore({ clipOwners: {} })
  return { store, owners: createClipOwnership(store, { platform }) }
}

describe('clip ownership', () => {
  it('remembers which account made a clip', () => {
    const { owners } = setup()
    owners.setOwner('C:\\Clips\\polished_a.mp4', 'alice')
    expect(owners.ownerOf('C:\\Clips\\polished_a.mp4')).toBe('alice')
    expect(owners.ownerOf('C:\\Clips\\polished_b.mp4')).toBeNull()
  })

  it('ignores clips made while nobody was logged in', () => {
    const { owners, store } = setup()
    owners.setOwner('C:\\Clips\\a.mp4', null)
    expect(store.get('clipOwners')).toEqual({})
  })

  it('treats Windows paths case-insensitively', () => {
    const { owners } = setup('win32')
    owners.setOwner('C:\\Clips\\Polished_A.MP4', 'alice')
    expect(owners.ownerOf('c:\\clips\\polished_a.mp4')).toBe('alice')
  })

  it('keeps case-sensitive paths distinct on Linux and macOS', () => {
    const { owners } = setup('linux')
    owners.setOwner('/clips/A.mp4', 'alice')
    expect(owners.ownerOf('/clips/a.mp4')).toBeNull()
  })

  it('normalises equivalent spellings of the same path', () => {
    const { owners } = setup('win32')
    owners.setOwner('C:\\Clips\\sub\\..\\a.mp4', 'alice')
    expect(owners.ownerOf('C:\\Clips\\a.mp4')).toBe('alice')
  })

  it('forgets a deleted clip', () => {
    const { owners } = setup()
    owners.setOwner('C:\\Clips\\a.mp4', 'alice')
    owners.forget('C:\\Clips\\a.mp4')
    expect(owners.ownerOf('C:\\Clips\\a.mp4')).toBeNull()
  })

  it('moves ownership to the new path when a clip is renamed', () => {
    const { owners } = setup()
    owners.setOwner('C:\\Clips\\a.mp4', 'alice')
    owners.move('C:\\Clips\\a.mp4', 'C:\\Clips\\best play.mp4')
    expect(owners.ownerOf('C:\\Clips\\a.mp4')).toBeNull()
    expect(owners.ownerOf('C:\\Clips\\best play.mp4')).toBe('alice')
  })

  it('keeps the owner when a rename only changes letter case on Windows', () => {
    const { owners } = setup('win32')
    owners.setOwner('C:\\Clips\\clip.mp4', 'alice')
    owners.move('C:\\Clips\\clip.mp4', 'C:\\Clips\\Clip.mp4')
    expect(owners.ownerOf('C:\\Clips\\Clip.mp4')).toBe('alice')
  })
})

describe('forgetAccount', () => {
  it("removes only the deleted account's data when others remain", () => {
    const store = createMemoryStore({
      hotkey: 'F6',
      onboardingComplete: { alice: true, bob: true },
      clipOwners: { 'c:\\clips\\a.mp4': 'alice', 'c:\\clips\\b.mp4': 'bob' }
    })
    forgetAccount(store, 'alice')
    expect(store.get('onboardingComplete')).toEqual({ bob: true })
    expect(store.get('clipOwners')).toEqual({ 'c:\\clips\\b.mp4': 'bob' })
    expect(store.get('hotkey')).toBe('F6') // shared settings stay for bob
  })

  it('resets everything once the last account is deleted', () => {
    const store = createMemoryStore({
      hotkey: 'F6',
      onboardingComplete: { alice: true },
      clipOwners: { 'c:\\clips\\a.mp4': 'alice' }
    })
    forgetAccount(store, 'alice')
    expect(store.dump()).toEqual({})
  })
})
