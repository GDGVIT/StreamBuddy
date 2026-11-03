import { useState, useEffect, useMemo, useCallback } from 'react'
import Settings from './Settings'
import ObsDisconnectedModal from './modals/ObsDisconnectedModal'
import DirectoryModal from './modals/DirectoryModal'
import StepBadge from './ui/StepBadge'
import Stage from './ui/Stage'
import ChunkyButton from './ui/ChunkyButton'
import ClipCard from './dashboard/ClipCard'
import ExportModal from './dashboard/ExportModal'
import { ClipReadyModal, DeleteConfirmModal, ClipPlayerModal } from './dashboard/ClipDialogs'
import { countClips, fileName } from './dashboard/clipUtils'

import logo from '../assets/img4.svg'
import accountIcon from '../assets/ic_outline-account-circle.svg'
import videoIcon from '../assets/iconoven_video-clip.svg'

const STAGES = [
  { key: 'clipping', label: 'Clipping' },
  { key: 'transcribing', label: 'Transcribing' },
  { key: 'finalising', label: 'Finalising' }
]

// Light-purple pill used for Search / Export Selection / Delete
const PILL = 'h-[2.75cqw] rounded-full bg-sb-dash px-[1cqw] font-body text-[1.45cqw] font-bold tracking-[0.05em] shadow-[0_0.3cqw_0_#5b2d86]'

// ── Panels ────────────────────────────────────────────────────────────────────
// White card with a yellow label tab sitting on its top edge
function Panel ({ title, icon, className = '', shadow, children }) {
  return (
    <section aria-label={title} className={`absolute rounded-[1.1cqw] border-[0.4cqw] border-black bg-white ${shadow} ${className}`}>
      <h2 className="absolute top-[-2.4cqw] left-[0.8cqw] flex h-[3.6cqw] w-[21.5cqw] items-center gap-[1cqw] rounded-[0.6cqw] bg-sb-tab-yellow px-[1cqw] font-body text-[1.9cqw] font-bold tracking-wider shadow-[0_0.5cqw_0_#000]">
        {icon && <img src={icon} alt="" className="my-[-0.6cqw] h-[3.8cqw] w-[3.8cqw]" />}
        {title}
      </h2>
      {children}
    </section>
  )
}

function ProcessingIndicator ({ currentStage }) {
  const currentIndex = STAGES.findIndex(s => s.key === currentStage)
  return (
    <div className="flex w-full flex-col items-center gap-[1.4cqw]" aria-live="polite">
      <ol className="flex items-center gap-[1.2cqw]">
        {STAGES.map((stage, index) => {
          const status = currentIndex > index ? 'done' : currentIndex === index ? 'active' : 'pending'
          return (
            <li key={stage.key} className="flex items-center gap-[1.2cqw]">
              {index > 0 && <span aria-hidden="true" className="h-[0.25cqw] w-[2cqw] rounded-full bg-black/25" />}
              <span className="flex items-center gap-[0.7cqw] font-body text-[1.5cqw] font-bold">
                <StepBadge number={index + 1} status={status} className="h-[2.4cqw] w-[2.6cqw] text-[1.4cqw]" />
                {stage.label}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="font-body text-[1.15cqw] font-bold text-black/55">
        {STAGES[currentIndex] ? `${STAGES[currentIndex].label}\u2026 hang tight, your clip is on its way.` : 'Working\u2026'}
      </p>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard ({ user, username, onUsernameChange, currentStage, onLogout }) {
  const [obsStatus, setObsStatus] = useState('checking') // checking | connected | disconnected
  const [hotkey, setHotkey] = useState('F5')
  const [clips, setClips] = useState([])
  const [durations, setDurations] = useState({}) // path → seconds, filled in as thumbnails load
  const [search, setSearch] = useState('')
  const [selectedPaths, setSelectedPaths] = useState(new Set())
  const [dismissed, setDismissed] = useState(false)
  const [settingsTab, setSettingsTab] = useState(null) // null = closed
  const [showObsAlert, setShowObsAlert] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [showFolderAlert, setShowFolderAlert] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [playingClip, setPlayingClip] = useState(null)
  const [pipelineError, setPipelineError] = useState('') // why the last clip failed, if it did

  // currentStage is a string ('clipping' | 'transcribing' | 'finalising'),
  // an object { status: 'completed', path } when done, or null when idle/cancelled
  const isCompleted = currentStage?.status === 'completed' && !dismissed
  const finalPath = currentStage?.path || ''
  const showProcessing = currentStage && currentStage.status !== 'completed'
  const selectionMode = selectedPaths.size > 0
  const stats = useMemo(() => countClips(clips), [clips])
  const visibleClips = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? clips.filter(c => c.name.toLowerCase().includes(q)) : clips
  }, [clips, search])
  const selectedClips = clips.filter(c => selectedPaths.has(c.path))

  const refreshClips = useCallback(async () => {
    const list = await window.electronAPI.listClips()
    setClips(list)
    return list
  }, [])

  const recordDuration = useCallback((path, seconds) => {
    setDurations(prev => (prev[path] === seconds ? prev : { ...prev, [path]: seconds }))
  }, [])

  // Load OBS status and the hotkey
  useEffect(() => {
    window.electronAPI.getObsStatus().then(r => setObsStatus(r.connected ? 'connected' : 'disconnected'))
    window.electronAPI.getHotkey().then(k => setHotkey(k || 'F5'))
  }, [])

  // Tell the main process who's logged in (new clips are saved as theirs), then list
  // this account's clips. Logging out unmounts the dashboard and clears it again.
  useEffect(() => {
    let open = true
    window.electronAPI.setCurrentUser(user.id).then(() => { if (open) refreshClips() })
    return () => {
      open = false
      window.electronAPI.setCurrentUser(null)
    }
  }, [user.id, refreshClips])

  // The global hotkey only works while the dashboard is showing
  useEffect(() => {
    window.electronAPI.setAppReady(true)
    return () => window.electronAPI.setAppReady(false)
  }, [])

  useEffect(() => {
    window.electronAPI.onObsError(() => {
      setObsStatus('disconnected')
      setShowObsAlert(true)
    })
    window.electronAPI.onOutputFolderMissing(() => setShowFolderAlert(true))
    window.electronAPI.onPipelineError((event, message) => setPipelineError(message))
  }, [])

  // New run: show the "clip ready" dialog again when it finishes
  useEffect(() => {
    if (currentStage && currentStage.status !== 'completed') {
      setDismissed(false)
      setPipelineError('')
    }
  }, [currentStage])

  // A clip finished: reload the folder (and make sure the new clip is listed)
  useEffect(() => {
    if (currentStage?.status !== 'completed' || !currentStage?.path) return
    const path = currentStage.path
    refreshClips().then(list => {
      if (!list.some(c => c.path === path)) {
        setClips(prev => [{ path, name: fileName(path), size: NaN, createdAt: Date.now() }, ...prev])
      }
    })
  }, [currentStage, refreshClips])

  // Escape leaves selection mode
  useEffect(() => {
    if (!selectionMode) return
    function handleKey (e) { if (e.key === 'Escape') setSelectedPaths(new Set()) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectionMode])

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
      refreshClips()
    }
  }

  function toggleSelect (path) {
    setSelectedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  async function handleDeleteSelected () {
    setDeleting(true)
    await window.electronAPI.deleteClips([...selectedPaths])
    setSelectedPaths(new Set())
    setDeleting(false)
    setShowDeleteConfirm(false)
    refreshClips()
  }

  function handleRenamedClip (oldPath, newPath) {
    setClips(prev => prev.map(c => (c.path === oldPath ? { ...c, path: newPath, name: fileName(newPath) } : c)))
  }

  // In selection mode, clicking anywhere that isn't a clip, the search box or the
  // Delete / Export buttons clears the selection, including the page around the window
  function handlePageClick (e) {
    if (!selectionMode) return
    // Clicks inside portalled dialogs (Export, Settings) bubble through React to here
    // too, but they aren't inside this page's DOM, so they're ignored
    if (!e.currentTarget.contains(e.target)) return
    if (e.target.closest('[data-clip], [data-keep-selection]')) return
    // Ignore clicks on a scrollbar
    if (e.nativeEvent.offsetX > e.target.clientWidth) return
    setSelectedPaths(new Set())
  }

  function handleSettingsSaved (changes) {
    if (changes.hotkey) setHotkey(changes.hotkey)
    if (changes.outputFolder) refreshClips()
  }

  return (
    <Stage onClick={handlePageClick} className="bg-sb-page-purple font-display text-black">
      {/* App window, centred. On windows wider than 16:9 it stretches sideways to
          keep the same small margin; the extra width is split between the two columns. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[51.8cqw] w-[max(94cqw,calc(100vw-6cqw))] shrink-0 overflow-hidden rounded-[1.3cqw] border-[0.33cqw] border-black bg-sb-dash">
          <header className="flex h-[6.9cqw] items-center justify-between border-b-[0.33cqw] border-black bg-sb-purple-dark pl-[2cqw] pr-[1.4cqw]">
            <img src={logo} alt="StreamBuddy" className="w-[25.4cqw] brightness-0 invert" />
            <button
              type="button"
              onClick={() => setSettingsTab('account')}
              aria-label="Account and settings"
              className="cursor-pointer rounded-full"
            >
              <img src={accountIcon} alt="" className="w-[5.65cqw]" />
            </button>
          </header>

          {/* Status bar */}
          <div className="absolute left-[4.1cqw] right-[4.04cqw] top-[9.7cqw] flex h-[6.2cqw] items-center justify-between rounded-[1.5cqw] bg-sb-green pl-[5.5cqw] pr-[2.2cqw] shadow-[0.4cqw_1cqw_0_#000]">
            <p className="flex items-baseline gap-[1.6cqw]">
              <span className="text-[2.9cqw] font-bold">Status:</span>
              <span className="font-body text-[2.15cqw] font-medium tracking-wider">
                {obsStatus === 'connected' ? 'OBS Connected' : obsStatus === 'checking' ? 'Checking OBS…' : 'OBS Disconnected'}
              </span>
              {obsStatus === 'disconnected' && (
                <button type="button" onClick={handleRetryObs} disabled={reconnecting} className="cursor-pointer font-body text-[1.3cqw] font-bold underline disabled:opacity-60">
                  {reconnecting ? 'Checking…' : 'Retry'}
                </button>
              )}
            </p>
            <p className="font-body text-[2.15cqw] font-bold tracking-wider">{hotkey} Hotkey Selected</p>
          </div>

          {/* Recent clips */}
          <Panel title="Recent Clips" icon={videoIcon} shadow="shadow-[-0.3cqw_1.7cqw_0_#000]" className="left-[4.1cqw] top-[20.6cqw] h-[27.3cqw] w-[calc(43.1cqw+(100%-93.34cqw)/2)]">
            <div data-keep-selection className="absolute inset-x-[1.3cqw] top-[3.7cqw] flex items-center justify-between gap-[1cqw]">
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search"
                aria-label="Search clips"
                className={`${PILL} w-[17cqw] text-black outline-none placeholder:text-black focus-visible:ring-[0.2cqw] focus-visible:ring-sb-purple-dark`}
              />
              {selectionMode && (
                <div className="flex gap-[0.8cqw]">
                  <ChunkyButton onClick={() => setShowDeleteConfirm(true)} className={`${PILL} text-[1.25cqw]`}>Delete</ChunkyButton>
                  <ChunkyButton onClick={() => setShowExport(true)} className={`${PILL} text-[1.25cqw]`}>Export Selection</ChunkyButton>
                </div>
              )}
            </div>

            <div className="absolute inset-x-[1.3cqw] bottom-[0.8cqw] top-[8.6cqw] overflow-y-auto pr-[0.8cqw] [scrollbar-color:#612298_transparent] scrollbar-thin">
              {clips.length === 0
                ? <p className="pt-[3cqw] text-center font-body text-[1.3cqw] font-bold text-black/60">No clips yet — press {hotkey} while streaming to make one.</p>
                : visibleClips.length === 0
                  ? <p className="pt-[3cqw] text-center font-body text-[1.3cqw] font-bold text-black/60">No clips match “{search}”.</p>
                  : (
                    <ul className="grid grid-cols-[repeat(auto-fill,10.2cqw)] gap-x-[1.2cqw] gap-y-[1.1cqw] pb-[0.6cqw] pl-[0.3cqw] pt-[0.3cqw]">
                      {visibleClips.map(clip => (
                        <ClipCard
                          key={clip.path}
                          clip={clip}
                          selectionMode={selectionMode}
                          selected={selectedPaths.has(clip.path)}
                          onPlay={() => setPlayingClip(clip)}
                          onToggleSelect={() => toggleSelect(clip.path)}
                          onDuration={recordDuration}
                        />
                      ))}
                    </ul>
                    )}
            </div>
          </Panel>

          {/* Quick stats */}
          <Panel title="Quick Stats" shadow="shadow-[0.35cqw_1cqw_0_#000]" className="left-[calc(49.2cqw+(100%-93.34cqw)/2)] right-[0.94cqw] top-[21.2cqw] h-[11.3cqw]">
            <dl className="absolute left-[1.9cqw] top-[3.4cqw] font-body text-[1.85cqw] font-bold leading-[3.2cqw] tracking-wider">
              <div className="flex gap-[1cqw]"><dt>Today:</dt><dd>{stats.today}</dd></div>
              <div className="flex gap-[1cqw]"><dt>This Week:</dt><dd>{stats.week}</dd></div>
            </dl>
          </Panel>

          {/* Pipeline progress */}
          <Panel title="Standing By" shadow="shadow-[0.35cqw_1cqw_0_#000]" className="left-[calc(49.2cqw+(100%-93.34cqw)/2)] right-[0.94cqw] top-[36.7cqw] h-[11.3cqw]">
            <div className="absolute inset-x-[1.9cqw] bottom-[0.6cqw] top-[1.6cqw] flex items-center justify-center">
              {showProcessing
                ? <ProcessingIndicator currentStage={currentStage} />
                : pipelineError
                  ? (
                    <p role="alert" className="font-body text-[1.35cqw] font-bold text-red-700">
                      That clip didn&apos;t work: {pipelineError} Press {hotkey} to try again.
                    </p>
                    )
                  : <p className="font-body text-[1.45cqw] font-bold text-black/60">Waiting for the hotkey — press {hotkey} to clip the last moments.</p>}
            </div>
          </Panel>
        </div>
      </div>

      {/* ── Dialogs ── */}
      {isCompleted && <ClipReadyModal finalPath={finalPath} onDismiss={() => setDismissed(true)} onRenamed={handleRenamedClip} />}

      {showExport && selectedClips.length > 0 && (
        <ExportModal
          clips={selectedClips}
          durations={durations}
          onClose={() => setShowExport(false)}
          onExported={() => { setShowExport(false); setSelectedPaths(new Set()) }}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmModal
          count={selectedPaths.size}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteSelected}
          deleting={deleting}
        />
      )}

      {playingClip && <ClipPlayerModal clip={playingClip} onDismiss={() => setPlayingClip(null)} />}

      {settingsTab && (
        <Settings
          user={user}
          username={username}
          initialTab={settingsTab}
          onClose={() => setSettingsTab(null)}
          onSaved={handleSettingsSaved}
          onUsernameChange={onUsernameChange}
          onLogout={onLogout}
        />
      )}

      {showObsAlert && (
        <ObsDisconnectedModal onDismiss={() => setShowObsAlert(false)} onRetry={handleRetryObs} reconnecting={reconnecting} />
      )}

      {showFolderAlert && (
        <DirectoryModal variant="missing" onPickFolder={handleSelectNewFolder} onGoBack={() => setShowFolderAlert(false)} />
      )}
    </Stage>
  )
}
