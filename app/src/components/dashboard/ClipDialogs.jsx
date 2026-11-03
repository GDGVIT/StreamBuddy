import { useEffect, useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import DialogCard from '../ui/DialogCard'
import ChunkyButton from '../ui/ChunkyButton'
import { toClipUrl, baseName, fileName } from './clipUtils'

// These three dialogs aren't in the Figma file; they reuse the Export dialog's look.

const BUTTON = 'h-[2.9cqw] rounded-[0.3cqw] border-[0.12cqw] border-black px-[1.4cqw] text-[1.3cqw] shadow-[0.25cqw_0.3cqw_0_#000]'

// Shown when the pipeline finishes a clip
export function ClipReadyModal ({ finalPath, onDismiss, onRenamed }) {
  const [currentPath, setCurrentPath] = useState(finalPath)
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { setCurrentPath(finalPath) }, [finalPath])

  async function handleRenameSave () {
    if (!nameInput.trim()) return
    setBusy(true)
    const result = await window.electronAPI.renameClip(currentPath, nameInput.trim())
    setBusy(false)
    if (result.success) {
      setCurrentPath(result.path)
      setEditing(false)
      onRenamed?.(currentPath, result.path)
    } else {
      setMessage(result.error)
    }
  }

  async function handleExport () {
    const folder = await window.electronAPI.pickFolder()
    if (!folder.success) return
    const result = await window.electronAPI.exportClip(currentPath, folder.path)
    setMessage(result.success ? `Copied to ${folder.path}` : result.error)
  }

  return (
    <DialogCard label="Clip ready" onClose={onDismiss} className="w-[40cqw]" bodyClassName="flex flex-col items-center px-[2.5cqw] pb-[2cqw] pt-[1.6cqw]">
      <h3 className="text-[2.4cqw] font-bold">Clip <span className="text-sb-purple-ink">Ready</span></h3>
      <p className="mt-[0.4cqw] font-body text-[1.1cqw]">Your clip has been processed and saved to your output folder.</p>

      <div className="mt-[1.3cqw] flex h-[2.6cqw] items-center gap-[0.6cqw]">
        {editing
          ? (
            <>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRenameSave() }}
                autoFocus
                aria-label="New clip name"
                className="h-[2.2cqw] w-[22cqw] rounded-full border-[0.12cqw] border-black bg-white px-[0.8cqw] font-body text-[1.1cqw] font-bold outline-none"
              />
              <ChunkyButton onClick={handleRenameSave} disabled={busy} aria-label="Save name" className="h-[2.2cqw] w-[2.2cqw] rounded-full border-[0.12cqw] border-black bg-sb-green">
                <Check className="h-[1.3cqw] w-[1.3cqw]" strokeWidth={3} />
              </ChunkyButton>
            </>
            )
          : (
            <button
              type="button"
              onClick={() => { setNameInput(baseName(currentPath)); setEditing(true) }}
              className="flex cursor-pointer items-center gap-[0.5cqw] font-body text-[1.15cqw] font-bold"
            >
              {fileName(currentPath)} <Pencil className="h-[1cqw] w-[1cqw]" />
            </button>
            )}
      </div>

      {message && <p className="mt-[0.4cqw] max-w-full truncate font-body text-[0.95cqw]">{message}</p>}

      <div className="mt-[1.4cqw] flex gap-[1.2cqw]">
        <ChunkyButton onClick={() => window.electronAPI.openFileDirectory(currentPath)} className={`${BUTTON} bg-sb-green`}>
          View in Folder
        </ChunkyButton>
        <ChunkyButton onClick={handleExport} className={`${BUTTON} bg-sb-yellow`}>
          Export a Copy→
        </ChunkyButton>
      </div>
    </DialogCard>
  )
}

export function DeleteConfirmModal ({ count, onCancel, onConfirm, deleting }) {
  return (
    <DialogCard label="Delete clips" onClose={onCancel} className="w-[36cqw]" bodyClassName="flex flex-col items-center px-[2.5cqw] pb-[2cqw] pt-[1.6cqw] text-center">
      <h3 className="text-[2.2cqw] font-bold">Delete {count} clip{count > 1 ? 's' : ''}?</h3>
      <p className="mt-[0.6cqw] font-body text-[1.1cqw]">
        This permanently deletes {count > 1 ? 'these files' : 'this file'} from your computer. It can&apos;t be undone.
      </p>
      <div className="mt-[1.6cqw] flex gap-[1.2cqw]">
        <ChunkyButton onClick={onCancel} className={`${BUTTON} bg-white`}>Cancel</ChunkyButton>
        <ChunkyButton onClick={onConfirm} disabled={deleting} className={`${BUTTON} bg-sb-pink`}>
          {deleting ? 'Deleting…' : 'Delete'}
        </ChunkyButton>
      </div>
    </DialogCard>
  )
}

export function ClipPlayerModal ({ clip, onDismiss }) {
  return (
    <DialogCard label={`Playing ${clip.name}`} onClose={onDismiss} bodyClassName="bg-black">
      <video src={toClipUrl(clip.path)} controls autoPlay className="block max-h-[44cqw] max-w-[80cqw]" />
    </DialogCard>
  )
}
