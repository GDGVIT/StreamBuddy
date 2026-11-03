import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { baseName, countClips, fileName, folderName, formatDuration, formatSize, timeAgo, toClipUrl } from '../../src/components/dashboard/clipUtils'

describe('path helpers', () => {
  it.each([
    ['C:\\Users\\Parzaan\\Clips\\polished_Replay 2026.mp4', 'polished_Replay 2026.mp4', 'polished_Replay 2026', 'Clips'],
    ['/home/me/clips/a.b.mov', 'a.b.mov', 'a.b', 'clips'],
    ['clip.mp4', 'clip.mp4', 'clip', '']
  ])('%s', (p, file, base, folder) => {
    expect(fileName(p)).toBe(file)
    expect(baseName(p)).toBe(base)
    expect(folderName(p)).toBe(folder)
  })

  it('builds clip:// URLs that survive spaces and # in Windows paths', () => {
    const url = toClipUrl('C:\\Clips\\best #1.mp4')
    expect(url).toBe('clip://local/?path=C%3A%5CClips%5Cbest%20%231.mp4')
    expect(decodeURIComponent(new URL(url).searchParams.get('path'))).toBe('C:\\Clips\\best #1.mp4')
  })
})

describe('formatting', () => {
  it.each([
    [0, '0:00'],
    [59.4, '0:59'],
    [59.6, '1:00'],
    [125, '2:05'],
    [NaN, '–'],
    [Infinity, '–']
  ])('formatDuration(%s) → %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected)
  })

  it.each([
    [100, '1KB'],
    [512 * 1024, '512KB'],
    [29e6, '28MB'],
    [NaN, '–']
  ])('formatSize(%s) → %s', (bytes, expected) => {
    expect(formatSize(bytes)).toBe(expected)
  })
})

describe('time-based helpers', () => {
  const NOW = new Date('2026-11-03T15:00:00').getTime()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    [10 * 1000, 'just now'],
    [60 * 1000, '1 minute ago'],
    [5 * 60 * 1000, '5 minutes ago'],
    [60 * 60 * 1000, '1 hour ago'],
    [3 * 60 * 60 * 1000, '3 hours ago'],
    [24 * 60 * 60 * 1000, '1 day ago'],
    [-5000, 'just now'] // clock skew: a file dated slightly in the future
  ])('timeAgo(now - %i ms) → %s', (offset, expected) => {
    expect(timeAgo(NOW - offset)).toBe(expected)
  })

  it('counts clips made today and in the last 7 days', () => {
    const hour = 60 * 60 * 1000
    const clips = [
      { createdAt: NOW - hour }, // today
      { createdAt: new Date('2026-11-03T00:00:01').getTime() }, // today, just after midnight
      { createdAt: new Date('2026-11-02T23:59:59').getTime() }, // yesterday
      { createdAt: NOW - 6 * 24 * hour }, // this week
      { createdAt: NOW - 8 * 24 * hour } // older
    ]
    expect(countClips(clips)).toEqual({ today: 2, week: 4 })
  })
})
