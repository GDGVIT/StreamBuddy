import { useRef } from 'react'
import { Play } from 'lucide-react'
import { toClipUrl, timeAgo, folderName } from './clipUtils'

const LONG_PRESS_MS = 500

// Thumbnail = the video's first frame (preload="metadata" only fetches the start of the file)
export function ClipThumbnail ({ clip, onDuration, className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-[#1F303D] ${className}`}>
      <video
        src={`${toClipUrl(clip.path)}#t=0.5`}
        preload="metadata"
        muted
        tabIndex={-1}
        onLoadedMetadata={e => onDuration?.(clip.path, e.currentTarget.duration)}
        className="pointer-events-none h-full w-full object-cover"
      />
      <span className="absolute left-1/2 top-1/2 flex h-[1.9cqw] w-[1.9cqw] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/25">
        <Play className="ml-[0.1cqw] h-[0.9cqw] w-[0.9cqw] fill-white text-white" />
      </span>
    </div>
  )
}

export function ClipMeta ({ clip, className = '' }) {
  return (
    <div className={`bg-sb-dash px-[0.5cqw] py-[0.2cqw] font-body text-[0.62cqw] leading-tight text-black/70 ${className}`}>
      <p className="truncate text-black">{clip.name}</p>
      <p className="flex justify-between gap-[0.4cqw]">
        <span className="shrink-0">{timeAgo(clip.createdAt)}</span>
        <span className="truncate">{folderName(clip.path)}</span>
      </p>
    </div>
  )
}

// Click plays the clip. Long-press or Ctrl/Cmd+click starts selecting; while
// selecting, a click toggles the clip.
export default function ClipCard ({ clip, selectionMode, selected, onPlay, onToggleSelect, onDuration }) {
  const pressTimer = useRef(null)
  const longPressed = useRef(false)

  function handleMouseDown () {
    longPressed.current = false
    pressTimer.current = setTimeout(() => {
      longPressed.current = true
      if (!selected) onToggleSelect()
    }, LONG_PRESS_MS)
  }

  function clearPressTimer () {
    clearTimeout(pressTimer.current)
  }

  function handleClick (e) {
    // The click that ends a long-press shouldn't undo the selection it just made
    if (longPressed.current) {
      longPressed.current = false
      return
    }
    if (selectionMode || e.ctrlKey || e.metaKey) onToggleSelect()
    else onPlay()
  }

  return (
    <li>
      <button
        type="button"
        data-clip
        onMouseDown={handleMouseDown}
        onMouseUp={clearPressTimer}
        onMouseLeave={clearPressTimer}
        onClick={handleClick}
        aria-pressed={selectionMode ? selected : undefined}
        title={clip.name}
        className={`block w-[10.2cqw] cursor-pointer overflow-hidden rounded-[0.5cqw] text-left shadow-[0.25cqw_0.25cqw_0_#000] outline-offset-[0.2cqw] ${
          selected ? 'ring-[0.25cqw] ring-sb-purple-dark' : ''
        }`}
      >
        <ClipThumbnail clip={clip} onDuration={onDuration} className="h-[4.1cqw]" />
        <ClipMeta clip={clip} />
      </button>
    </li>
  )
}
