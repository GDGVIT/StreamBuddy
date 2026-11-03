// Small helpers shared by the dashboard pieces

// Videos reach the renderer through the custom clip:// protocol registered in main.js
export function toClipUrl (rawPath) {
  return `clip://local/?path=${encodeURIComponent(rawPath)}`
}

export function fileName (p) {
  return p.split(/[\\/]/).pop() || ''
}

export function baseName (p) {
  return fileName(p).replace(/\.[^/.]+$/, '')
}

export function folderName (p) {
  const parts = p.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 2] || ''
}

export function timeAgo (ms) {
  const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function formatDuration (seconds) {
  if (!Number.isFinite(seconds)) return '–'
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function formatSize (bytes) {
  if (!Number.isFinite(bytes)) return '–'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`
  return `${Math.round(bytes / (1024 * 1024))}MB`
}

// Clips created today / in the last 7 days (for Quick Stats)
export function countClips (clips) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return {
    today: clips.filter(c => c.createdAt >= startOfToday.getTime()).length,
    week: clips.filter(c => c.createdAt >= weekAgo).length
  }
}
