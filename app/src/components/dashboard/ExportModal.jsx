import { useState } from 'react'
import DialogCard from '../ui/DialogCard'
import ChunkyButton from '../ui/ChunkyButton'
import folderIcon from '../../assets/emojione-v1_open-folder.svg'
import { ClipThumbnail, ClipMeta } from './ClipCard'
import { baseName, formatDuration, formatSize } from './clipUtils'

// Copies the selected clips to a folder the user picks. With a single clip the
// copy can be renamed; with several, each keeps its own name.
export default function ExportModal ({ clips, durations, onClose, onExported }) {
  const single = clips.length === 1
  const first = clips[0]
  const [name, setName] = useState(single ? baseName(first.path) : '')
  const [destination, setDestination] = useState('')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const totalSize = clips.reduce((sum, c) => sum + c.size, 0)
  const totalDuration = clips.reduce((sum, c) => sum + (durations[c.path] ?? NaN), 0)

  async function handlePickDestination () {
    const result = await window.electronAPI.pickFolder()
    if (result.success) {
      setDestination(result.path)
      setError('')
    }
  }

  async function handleExport () {
    if (!destination) {
      setError('Choose a destination folder first.')
      return
    }
    if (single && !name.trim()) {
      setError('Give the clip a file name.')
      return
    }
    setExporting(true)
    setError('')
    for (const clip of clips) {
      const result = await window.electronAPI.exportClip(clip.path, destination, single ? name.trim() : undefined)
      if (!result.success) {
        setExporting(false)
        setError(result.error)
        return
      }
    }
    setExporting(false)
    onExported()
  }

  return (
    <DialogCard label="Export clips" onClose={onClose} className="w-[45.1cqw]" bodyClassName="relative h-[20.1cqw] px-[1.8cqw] pt-[1.7cqw]">
      <div className="flex gap-[3.4cqw]">
        <div className="w-[9.7cqw] shrink-0 overflow-hidden rounded-[0.5cqw] shadow-[0.25cqw_0.25cqw_0_#000]">
          <ClipThumbnail clip={first} className="h-[4.6cqw]" />
          <ClipMeta clip={first} />
        </div>

        <div className="min-w-0 flex-1">
          <label htmlFor="export-name" className="text-[1.4cqw] font-bold">File Name</label>
          {single
            ? (
              <input
                id="export-name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="mt-[0.7cqw] block h-[1.9cqw] w-[23.5cqw] rounded-full border-[0.12cqw] border-black bg-white px-[0.8cqw] font-body text-[1.1cqw] font-bold outline-none focus-visible:ring-[0.2cqw] focus-visible:ring-sb-purple-dark"
              />
              )
            : <p id="export-name" className="mt-[0.7cqw] font-body text-[1.1cqw] font-bold">{clips.length} clips — original names kept</p>}
          <p className="mt-[0.5cqw] inline-flex items-center gap-[0.4cqw] rounded-[0.25cqw] border-[0.1cqw] border-black bg-sb-peach px-[0.4cqw] py-[0.1cqw] font-body text-[0.78cqw] font-bold">
            Duration: {formatDuration(totalDuration)} <span className="text-[0.5cqw]">●</span> Size: {formatSize(totalSize)}
          </p>
        </div>
      </div>

      <p className="mt-[2.2cqw] text-[1.4cqw] font-bold">Destination</p>
      <button
        type="button"
        onClick={handlePickDestination}
        title={destination || 'Choose a folder'}
        className="mt-[0.5cqw] flex h-[2cqw] w-[12cqw] cursor-pointer items-center gap-[0.5cqw] rounded-[0.25cqw] border-[0.12cqw] border-black bg-white px-[0.5cqw] font-body text-[0.9cqw] font-bold"
      >
        <img src={folderIcon} alt="" className="h-[1.2cqw] w-[1.2cqw] shrink-0" />
        <span className="truncate">{destination || 'Choose folder…'}</span>
      </button>

      {error && <p role="alert" className="absolute bottom-[4.3cqw] right-[1.8cqw] max-w-[24cqw] text-right font-body text-[0.95cqw] font-bold text-red-700">{error}</p>}

      <ChunkyButton
        onClick={onClose}
        className="absolute bottom-[1.4cqw] left-[3.4cqw] h-[2.3cqw] w-[6.1cqw] rounded-[0.3cqw] border-[0.12cqw] border-black bg-sb-pink text-[1.25cqw] shadow-[0.25cqw_0.3cqw_0_#000]"
      >
        Cancel
      </ChunkyButton>
      <ChunkyButton
        onClick={handleExport}
        disabled={exporting}
        className="absolute bottom-[1.1cqw] right-[2cqw] h-[3cqw] w-[14.4cqw] rounded-[0.3cqw] border-[0.12cqw] border-black bg-sb-green text-[1.45cqw] shadow-[0.25cqw_0.3cqw_0_#000]"
      >
        {exporting ? 'Exporting…' : 'Export Selected→'}
      </ChunkyButton>
    </DialogCard>
  )
}
