import { useState, useEffect, useRef } from 'react'
import Settings from './Settings'
import ObsDisconnectedModal from './modals/ObsDisconnectedModal'
import DirectoryModal from './modals/DirectoryModal'

const STAGES = [
  { key: 'clipping', label: 'Clipping' },
  { key: 'transcribing', label: 'Transcribing' },
  { key: 'finalising', label: 'Finalising' }
]

// ── Processing indicator for Standing By panel ────────────────────────────────
function ProcessingIndicator ({ currentStage }) {
  const currentIndex = STAGES.findIndex(s => s.key === currentStage)

  return (
    <ol>
      {STAGES.map((stage, index) => {
        const isComplete = currentIndex > index
        const isActive = currentIndex === index
        const marker = isComplete ? '[done]' : isActive ? '[working…]' : '[pending]'

        return (
          <li key={stage.key} aria-current={isActive ? 'step' : undefined}>
            {marker} {stage.label}
          </li>
        )
      })}
    </ol>
  )
}

// ── Completion modal ──────────────────────────────────────────────────────────
function CompletionModal ({ finalPath, onDismiss, onRenamed }) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [currentPath, setCurrentPath] = useState(finalPath)

  useEffect(() => {
    setCurrentPath(finalPath)
  }, [finalPath])

  function baseName (p) {
    const file = p.split(/[\\/]/).pop() || ''
    return file.replace(/\.[^/.]+$/, '')
  }

  function startEditing () {
    setNameInput(baseName(currentPath))
    setEditingName(true)
  }

  async function handleRenameSave () {
    if (!nameInput.trim()) return
    setRenaming(true)
    const result = await window.electronAPI.renameClip(currentPath, nameInput.trim())
    setRenaming(false)
    if (result.success) {
      setCurrentPath(result.path)
      setEditingName(false)
      onRenamed?.(result.path)
    }
  }

  async function handleExport () {
    const result = await window.electronAPI.selectOutputFolder()
    if (result.success) {
      await window.electronAPI.exportClip(currentPath, result.path)
    }
  }

  return (
    <div role="dialog" aria-label="Clip ready">
      <button onClick={onDismiss}>Close</button>

      <h3>Clip Ready</h3>
      <p>Your clip has been processed and saved to your library folder.</p>

      {editingName
        ? (
          <p>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus />
            <button onClick={handleRenameSave} disabled={renaming}>Save name</button>
          </p>
          )
        : (
          <button onClick={startEditing}>Rename clip</button>
          )}

      {currentPath && <p><code>{currentPath}</code></p>}

      <button onClick={() => window.electronAPI.openFileDirectory(currentPath)}>View in Folder</button>
      <button onClick={handleExport}>Export to another folder</button>
    </div>
  )
}

// ── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteConfirmModal ({ count, onCancel, onConfirm, deleting }) {
  return (
    <div role="dialog" aria-label="Confirm delete">
      <h3>Delete {count} clip{count > 1 ? 's' : ''}?</h3>
      <p>
        This will permanently delete {count > 1 ? 'these files' : 'this file'} from your computer. This can&apos;t be undone.
      </p>

      <button onClick={onCancel}>Cancel</button>
      <button onClick={onConfirm} disabled={deleting}>
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  )
}

// Videos are served to the renderer through the custom clip:// protocol in main.js
function toClipUrl (rawPath) {
  return `clip://local/?path=${encodeURIComponent(rawPath)}`
}

// ── Clip player modal ─────────────────────────────────────────────────────────
function ClipPlayerModal ({ clip, onDismiss }) {
  return (
    <div role="dialog" aria-label="Clip player">
      <button onClick={onDismiss}>Close</button>
      <video src={toClipUrl(clip.path)} controls autoPlay style={{ maxHeight: '70vh' }} />
    </div>
  )
}

// ── Recent clip card ──────────────────────────────────────────────────────────
// Click = play. Long-press (500ms) = enter selection mode. In selection mode, click = toggle.
function ClipCard ({ clip, selectionMode, selected, onClick, onToggleSelect, onLongPress }) {
  const pressTimer = useRef(null)

  function handleMouseDown () {
    pressTimer.current = setTimeout(() => {
      onLongPress()
    }, 500)
  }

  function clearPressTimer () {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  function handleClick () {
    if (selectionMode) {
      onToggleSelect()
    } else {
      onClick()
    }
  }

  return (
    <li
      onMouseDown={handleMouseDown}
      onMouseUp={clearPressTimer}
      onMouseLeave={clearPressTimer}
      onClick={handleClick}
      aria-selected={selected}
      style={{ cursor: 'pointer' }}
    >
      {selectionMode && (selected ? '[x] ' : '[ ] ')}
      ▶ {clip.title} — {clip.time}
    </li>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard ({ user, username, onUsernameChange, currentStage, onLogout }) {
  const [dismissed, setDismissed] = useState(false)
  const [obsStatus, setObsStatus] = useState('checking') // checking | connected | disconnected
  const [hotkey, setHotkey] = useState('F5')
  const [recentClips, setRecentClips] = useState([])
  const [stats, setStats] = useState({ today: 0, week: 0 })
  const [showSettings, setShowSettings] = useState(false)
  const [showObsAlert, setShowObsAlert] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [showFolderAlert, setShowFolderAlert] = useState(false)
  const [playingClip, setPlayingClip] = useState(null)
  const [selectedClipIds, setSelectedClipIds] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // currentStage is a string ('clipping' | 'transcribing' | 'finalising'),
  // an object { status: 'completed', path } when done, or null when idle/cancelled
  const isCompleted = currentStage?.status === 'completed' && !dismissed
  const finalPath = currentStage?.path || ''
  const showProcessing = currentStage && currentStage.status !== 'completed'
  const selectionMode = selectedClipIds.size > 0

  // Reset dismiss state on new run
  useEffect(() => {
    if (currentStage && currentStage.status !== 'completed') {
      setDismissed(false)
    }
  }, [currentStage])

  // When a clip completes, add it to recent clips and update stats
  useEffect(() => {
    if (currentStage?.status === 'completed' && currentStage?.path) {
      const newClip = {
        id: Date.now(),
        title: currentStage.path.split(/[\\/]/).pop(),
        time: 'Just now',
        path: currentStage.path
      }
      setRecentClips(prev => [newClip, ...prev].slice(0, 6))
      setStats(prev => ({ today: prev.today + 1, week: prev.week + 1 }))
    }
  }, [currentStage])

  // Load OBS status and hotkey on mount
  useEffect(() => {
    window.electronAPI.getObsStatus().then(r => {
      setObsStatus(r.connected ? 'connected' : 'disconnected')
    })
    window.electronAPI.getHotkey().then(k => setHotkey(k || 'F5'))
  }, [])

  // The global hotkey only works while the dashboard is mounted
  useEffect(() => {
    window.electronAPI.setAppReady(true)
    return () => window.electronAPI.setAppReady(false)
  }, [])

  useEffect(() => {
    window.electronAPI.onObsError(() => {
      setObsStatus('disconnected')
      setShowObsAlert(true)
    })
  }, [])

  useEffect(() => {
    window.electronAPI.onOutputFolderMissing(() => {
      setShowFolderAlert(true)
    })
  }, [])

  async function handleRetryObs () {
    setReconnecting(true)
    const result = await window.electronAPI.connectOBS()
    setReconnecting(false)
    if (result.success) {
      setObsStatus('connected')
      setShowObsAlert(false)
    }
  }

  async function handleSelectNewFolder () {
    const result = await window.electronAPI.selectOutputFolder()
    if (result.success) {
      setShowFolderAlert(false)
    }
  }

  function toggleSelectClip (id) {
    setSelectedClipIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleLongPressClip (id) {
    setSelectedClipIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  async function handleDeleteSelected () {
    setDeleting(true)
    const clipsToDelete = recentClips.filter(c => selectedClipIds.has(c.id))
    await window.electronAPI.deleteClips(clipsToDelete.map(c => c.path))
    setRecentClips(prev => prev.filter(c => !selectedClipIds.has(c.id)))
    setSelectedClipIds(new Set())
    setDeleting(false)
    setShowDeleteConfirm(false)
  }

  function handleRenamedClip (newPath) {
    setRecentClips(prev => prev.map(c =>
      c.path === finalPath ? { ...c, path: newPath, title: newPath.split(/[\\/]/).pop() } : c
    ))
  }

  if (showSettings) {
    return <Settings user={user} onClose={() => setShowSettings(false)} onUsernameChange={onUsernameChange} />
  }

  return (
    <>
      <main>
        {/* ── Header ── */}
        <header>
          <h1>StreamBuddy</h1>
          <button onClick={() => setShowSettings(true)}>Settings</button>
          <button onClick={onLogout}>Log out</button>
        </header>

        {/* ── Greeting ── */}
        <p>Hi {username || 'there'} !</p>

        {/* ── Status bar ── */}
        <section>
          <p>
            {obsStatus === 'connected' ? 'Status: OBS Connected' : 'Status: OBS Disconnected'}
            {obsStatus === 'disconnected' && (
              <button onClick={handleRetryObs} disabled={reconnecting}>
                {reconnecting ? 'Checking...' : 'Retry connection'}
              </button>
            )}
          </p>
          <p>{hotkey} Hotkey Active</p>
        </section>

        {/* ── Recent Clips ── */}
        <section>
          <h2>Recent Clips</h2>
          {selectionMode && (
            <p>
              <button onClick={() => setSelectedClipIds(new Set())}>Cancel</button>
              <button onClick={() => setShowDeleteConfirm(true)} disabled={deleting}>
                {deleting ? 'Deleting...' : `Delete (${selectedClipIds.size})`}
              </button>
            </p>
          )}

          {recentClips.length === 0
            ? (
              <p>No clips yet — press {hotkey} to create one</p>
              )
            : (
              <ul>
                {recentClips.map(clip => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    selectionMode={selectionMode}
                    selected={selectedClipIds.has(clip.id)}
                    onClick={() => setPlayingClip(clip)}
                    onToggleSelect={() => toggleSelectClip(clip.id)}
                    onLongPress={() => handleLongPressClip(clip.id)}
                  />
                ))}
              </ul>
              )}
        </section>

        {/* ── Quick Stats ── */}
        <section>
          <h2>Quick Stats</h2>
          <p>Today: {stats.today}</p>
          <p>This Week: {stats.week}</p>
        </section>

        {/* ── Standing By / Processing ── */}
        <section>
          <h2>Standing By</h2>
          {showProcessing
            ? <ProcessingIndicator currentStage={currentStage} />
            : <p>Waiting for hotkey...</p>}
        </section>
      </main>

      {isCompleted && (
        <CompletionModal
          finalPath={finalPath}
          onDismiss={() => setDismissed(true)}
          onRenamed={handleRenamedClip}
        />
      )}

      {showObsAlert && (
        <ObsDisconnectedModal
          onDismiss={() => setShowObsAlert(false)}
          onRetry={handleRetryObs}
          reconnecting={reconnecting}
        />
      )}

      {showFolderAlert && (
        <DirectoryModal
          variant="missing"
          onPickFolder={handleSelectNewFolder}
          onGoBack={() => setShowFolderAlert(false)}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmModal
          count={selectedClipIds.size}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteSelected}
          deleting={deleting}
        />
      )}

      {playingClip && (
        <ClipPlayerModal
          clip={playingClip}
          onDismiss={() => setPlayingClip(null)}
        />
      )}
    </>
  )
}
