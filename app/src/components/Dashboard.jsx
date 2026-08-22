import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle2, Loader2, Circle, LogOut, ExternalLink, X, FolderOpen, Download, Settings as SettingsIcon, Trash2, Pencil, Check } from 'lucide-react'
import Settings from './Settings'
import img4 from '../assets/img4.svg'
import robot from '../assets/robot.svg'
import folder from '../assets/folder.svg'

const STAGES = [
    { key: 'clipping',     label: 'Clipping' },
    { key: 'transcribing', label: 'Transcribing' },
    { key: 'finalising',   label: 'Finalising' },
]

// ── Processing indicator for Standing By panel ────────────────────────────────
function ProcessingIndicator ({ currentStage }) {
    const currentIndex = STAGES.findIndex(s => s.key === currentStage)

    return (
        <ul className="flex flex-col gap-3 w-full">
            {STAGES.map((stage, index) => {
                const isComplete = currentIndex > index
                const isActive   = currentIndex === index
                const isPending  = currentIndex < index

                return (
                    <motion.li
                        key={stage.key}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: isPending ? 0.4 : 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-3"
                    >
                        <span className="shrink-0 w-4 h-4">
                            {isComplete && <CheckCircle2 className="w-full h-full text-emerald-400" />}
                            {isActive   && <Loader2     className="w-full h-full text-slate-200 animate-spin" />}
                            {isPending  && <Circle      className="w-full h-full text-slate-600" />}
                        </span>
                        <span className={`text-sm ${isActive ? 'text-slate-100 font-medium' : isComplete ? 'text-slate-300' : 'text-slate-500'}`}>
                            {stage.label}
                        </span>
                        {isActive && (
                            <motion.span
                                className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400"
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                            />
                        )}
                    </motion.li>
                )
            })}
        </ul>
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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 12 }}
                transition={{ duration: 0.25 }}
                className="relative bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl p-8 w-105 flex flex-col items-center gap-5"
            >
                {/* Close */}
                <button
                    onClick={onDismiss}
                    className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800/50 transition-colors duration-200 cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Icon */}
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
                    <CheckCircle2 className="w-9 h-9" />
                </div>

                {/* Text */}
                <div className="text-center space-y-1.5">
                    <h3 className="text-slate-100 font-semibold text-xl tracking-tight">Clip Ready</h3>
                    <p className="text-slate-400 text-sm leading-relaxed px-4">
                        Your clip has been processed and saved to your library folder.
                    </p>
                </div>

                {/* Rename */}
                <div className="w-full flex items-center gap-2">
                    {editingName ? (
                        <>
                            <input
                                value={nameInput}
                                onChange={e => setNameInput(e.target.value)}
                                autoFocus
                                className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-500"
                            />
                            <button
                                onClick={handleRenameSave}
                                disabled={renaming}
                                className="p-1.5 text-slate-300 hover:text-emerald-400 cursor-pointer disabled:opacity-50"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={startEditing}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer mx-auto"
                        >
                            <Pencil className="w-3 h-3" />
                            Rename clip
                        </button>
                    )}
                </div>

                {/* File path */}
                {currentPath && (
                    <p className="text-slate-600 text-xs font-mono text-center break-all px-2">
                        {currentPath}
                    </p>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2.5 w-full mt-1">
                    <button
                        onClick={() => window.electronAPI.openFileDirectory(currentPath)}
                        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-100 bg-indigo-600 hover:bg-indigo-500 py-3 px-4 rounded-xl cursor-pointer shadow-lg shadow-indigo-600/10 transition-all duration-200 group"
                    >
                        <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        <span>View in Folder</span>
                    </button>

                    <button
                        onClick={handleExport}
                        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 py-3 px-4 rounded-xl cursor-pointer transition-all duration-200"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export to another folder</span>
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ── OBS disconnect modal ──────────────────────────────────────────────────────
function ObsDisconnectModal ({ onDismiss, onRetry, reconnecting }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 12 }}
                transition={{ duration: 0.25 }}
                className="relative bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl py-10 px-5 w-150 flex flex-col items-center gap-4"
            >
                <button
                    onClick={onDismiss}
                    className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800/50 transition-colors duration-200 cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>

                <img src={robot} alt="" className="w-64 h-64 object-contain opacity-80" />

                <h3 className="text-slate-100 font-semibold text-2xl py-2">OBS Disconnected</h3>
                <p className="text-slate-400 text-base text-center py-2">
                    StreamBuddy lost connection to OBS. Make sure OBS is open with WebSocket enabled, then retry.
                </p>

                <button
                    onClick={onRetry}
                    disabled={reconnecting}
                    className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium rounded-xl cursor-pointer disabled:opacity-50"
                >
                    {reconnecting ? 'Checking...' : 'Retry Connection'}
                </button>
            </motion.div>
        </motion.div>
    )
}

// ── Output folder missing modal ───────────────────────────────────────────────
function FolderMissingModal ({ onDismiss, onSelectFolder }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 12 }}
                transition={{ duration: 0.25 }}
                className="relative bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl py-10 px-5 w-150 flex flex-col items-center gap-4"
            >
                <button
                    onClick={onDismiss}
                    className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800/50 transition-colors duration-200 cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>

                <img src={folder} alt="" className="w-64 h-64 object-contain opacity-80" />

                <h3 className="text-slate-100 font-semibold text-2xl -mt-6">Output Folder Missing</h3>
                <p className="text-slate-400 text-base text-center py-2">
                    The folder you selected for clips has been moved or deleted. Please choose a new output folder.
                </p>

                <button
                    onClick={onSelectFolder}
                    className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium rounded-xl cursor-pointer"
                >
                    Select New Folder
                </button>
            </motion.div>
        </motion.div>
    )
}

// ── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteConfirmModal ({ count, onCancel, onConfirm, deleting }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 12 }}
                transition={{ duration: 0.25 }}
                className="relative bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl p-8 w-105 flex flex-col items-center gap-4"
            >
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full">
                    <Trash2 className="w-7 h-7" />
                </div>

                <h3 className="text-slate-100 font-semibold text-lg">Delete {count} clip{count > 1 ? 's' : ''}?</h3>
                <p className="text-slate-400 text-sm text-center">
                    This will permanently delete {count > 1 ? 'these files' : 'this file'} from your computer. This can&apos;t be undone.
                </p>

                <div className="flex gap-3 w-full mt-1">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-xl cursor-pointer disabled:opacity-50"
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ── Clip player modal ─────────────────────────────────────────────────────────
function ClipPlayerModal ({ clip, onDismiss }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 12 }}
                transition={{ duration: 0.25 }}
                className="relative bg-slate-900 rounded-2xl p-4 w-[70vw] h-[70vh] flex items-center justify-center"
            >
                <button
                    onClick={onDismiss}
                    className="absolute -top-3 -right-3 bg-slate-800 rounded-full p-2 text-slate-300 hover:text-slate-100 cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>
                <video src={`clip://${clip.path.replace(/\\/g, '/')}`} controls autoPlay className="w-full h-full object-contain rounded-xl" />
            </motion.div>
        </motion.div>
    )
}

// ── Recent clip card ──────────────────────────────────────────────────────────
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
        <div
            onMouseDown={handleMouseDown}
            onMouseUp={clearPressTimer}
            onMouseLeave={clearPressTimer}
            onClick={handleClick}
            className={`relative bg-slate-800/60 border rounded-xl overflow-hidden group cursor-pointer transition-all duration-200 ${
                selected ? 'border-indigo-400' : 'border-slate-700/40 hover:border-slate-600/60'
            }`}
        >
            {selectionMode && (
                <div className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selected ? 'bg-indigo-500 border-indigo-400' : 'bg-slate-900/70 border-slate-500'
                }`}>
                    {selected && <Check className="w-3 h-3 text-white" />}
                </div>
            )}

            {/* Thumbnail */}
            <div className="relative aspect-video bg-slate-700/50 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-slate-600/80 flex items-center justify-center group-hover:bg-slate-500/80 transition-colors duration-200">
                    <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[9px] border-l-slate-200 ml-0.5" />
                </div>
            </div>

            {/* Meta */}
            <div className="px-2.5 py-2 flex items-center justify-between">
                <p className="text-slate-400 text-xs truncate">{clip.title}</p>
                <p className="text-slate-600 text-xs shrink-0 ml-2">{clip.time}</p>
            </div>
        </div>
    )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard ({ user, username, onUsernameChange, currentStage, onLogout }) {
    const [dismissed, setDismissed]   = useState(false)
    const [obsStatus, setObsStatus]   = useState('checking') // checking | connected | disconnected
    const [hotkey, setHotkey]         = useState('F5')
    const [recentClips, setRecentClips] = useState([])
    const [stats, setStats]           = useState({ today: 0, week: 0 })
    const [showSettings, setShowSettings] = useState(false)
    const [showObsAlert, setShowObsAlert] = useState(false)
    const [reconnecting, setReconnecting] = useState(false)
    const [showFolderAlert, setShowFolderAlert] = useState(false)
    const [playingClip, setPlayingClip] = useState(null)
    const [selectedClipIds, setSelectedClipIds] = useState(new Set())
    const [deleting, setDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const isCompleted   = currentStage?.status === 'completed' && !dismissed
    const finalPath     = currentStage?.path || ''
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
                path: currentStage.path,
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

    useEffect(() => {
        window.electronAPI.setAppReady(true)
        return () => window.electronAPI.setAppReady(false)
    }, [])

    useEffect(() => {
        window.electronAPI.onObsError((event, message) => {
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
            <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-3">
                <div className="relative w-full h-[calc(100vh-1.5rem)] bg-linear-to-br from-slate-800 to-slate-950 rounded-2xl overflow-hidden flex flex-col px-6 py-5 gap-4">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between w-full">
                        {/* Logo */}
                        <img src={img4} alt="StreamBuddy" className="w-[clamp(160px,18vw,320px)] object-contain" />

                        {/* Profile + Logout */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowSettings(true)}
                                className="w-12 h-12 rounded-full bg-slate-700 border border-slate-600/50 flex items-center justify-center hover:border-slate-500 hover:bg-slate-600 transition-all duration-200 cursor-pointer"
                                title="Settings"
                            >
                                <SettingsIcon className="w-5 h-5 text-slate-400" />
                            </button>
                            <button
                                onClick={onLogout}
                                className="w-12 h-12 rounded-full bg-slate-700 border border-slate-600/50 flex items-center justify-center hover:border-rose-500/40 hover:bg-slate-600 transition-all duration-200 cursor-pointer group"
                                title="Log out"
                            >
                                <LogOut className="w-5 h-5 text-slate-400 group-hover:text-rose-400 transition-colors" />
                            </button>
                        </div>
                    </div>

                    {/* ── Greeting ── */}
                    <p className="text-slate-300 text-2xl font-mono">Hi {username || 'there'} !</p>

                    {/* ── Status bar ── */}
                    <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-5">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${obsStatus === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <span className="text-slate-300 text-base">
                                {obsStatus === 'connected' ? 'Status: OBS Connected' : 'Status: OBS Disconnected'}
                            </span>
                            {obsStatus === 'disconnected' && (
                                <button
                                    onClick={handleRetryObs}
                                    disabled={reconnecting}
                                    className="ml-2 text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer disabled:opacity-50"
                                >
                                    {reconnecting ? 'Checking...' : 'Retry connection'}
                                </button>
                            )}
                        </div>
                        <span className="text-slate-400 text-base">{hotkey} Hotkey Active</span>
                    </div>

                    {/* ── Main content grid ── */}
                    <div className="flex-1 grid grid-cols-[1fr_380px] gap-4 min-h-0">

                        {/* Left — Recent Clips */}
                        <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5 flex flex-col gap-4 overflow-hidden">
                            <div className="flex items-center justify-between">
                                <p className="text-slate-400 text-sm font-medium">Recent Clips</p>
                                {selectionMode && (
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setSelectedClipIds(new Set())}
                                            className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            disabled={deleting}
                                            className="flex items-center gap-1.5 text-xs text-rose-300 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-50"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            {deleting ? 'Deleting...' : `Delete (${selectedClipIds.size})`}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {recentClips.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <p className="text-slate-600 text-sm">No clips yet — press {hotkey} to create one</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
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
                                </div>
                            )}
                        </div>

                        {/* Right column */}
                        <div className="flex flex-col gap-4">

                            {/* Quick Stats */}
                            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5 flex flex-col gap-3">
                                <p className="text-slate-400 text-sm font-medium">Quick Stats</p>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 text-sm">Today</span>
                                        <span className="text-slate-200 text-lg font-semibold">{stats.today}</span>
                                    </div>
                                    <div className="h-px bg-slate-700/40" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 text-sm">This Week</span>
                                        <span className="text-slate-200 text-lg font-semibold">{stats.week}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Standing By / Processing */}
                            <div className="flex-1 bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5 flex flex-col gap-4">
                                <p className="text-slate-400 text-sm font-medium">Standing By</p>

                                <div className="flex-1 flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        {showProcessing ? (
                                            <motion.div
                                                key="processing"
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                className="w-full"
                                            >
                                                <ProcessingIndicator currentStage={currentStage} />
                                            </motion.div>
                                        ) : (
                                            <motion.p
                                                key="idle"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="text-slate-600 text-sm text-center"
                                            >
                                                Waiting for hotkey...
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>

            {/* ── Completion modal ── */}
            <AnimatePresence>
                {isCompleted && (
                    <CompletionModal
                        finalPath={finalPath}
                        onDismiss={() => setDismissed(true)}
                        onRenamed={handleRenamedClip}
                    />
                )}
            </AnimatePresence>

            {/* ── OBS disconnect modal ── */}
            <AnimatePresence>
                {showObsAlert && (
                    <ObsDisconnectModal
                        onDismiss={() => setShowObsAlert(false)}
                        onRetry={handleRetryObs}
                        reconnecting={reconnecting}
                    />
                )}
            </AnimatePresence>

            {/* ── Output folder missing modal ── */}
            <AnimatePresence>
                {showFolderAlert && (
                    <FolderMissingModal
                        onDismiss={() => setShowFolderAlert(false)}
                        onSelectFolder={handleSelectNewFolder}
                    />
                )}
            </AnimatePresence>

            {/* ── Delete confirm modal ── */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <DeleteConfirmModal
                        count={selectedClipIds.size}
                        onCancel={() => setShowDeleteConfirm(false)}
                        onConfirm={handleDeleteSelected}
                        deleting={deleting}
                    />
                )}
            </AnimatePresence>

            {/* ── Clip player modal ── */}
            <AnimatePresence>
                {playingClip && (
                    <ClipPlayerModal
                        clip={playingClip}
                        onDismiss={() => setPlayingClip(null)}
                    />
                )}
            </AnimatePresence>
        </>
    )
}