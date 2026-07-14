import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle2, Loader2, Circle, LogOut, ExternalLink, X, FolderOpen, Download } from 'lucide-react'

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
function CompletionModal ({ finalPath, onDismiss }) {
    async function handleExport () {
        const result = await window.electronAPI.selectOutputFolder()
        if (result.success) {
            await window.electronAPI.exportClip(finalPath, result.path)
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
                className="relative bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl p-8 w-[420px] flex flex-col items-center gap-5"
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

                {/* File path */}
                {finalPath && (
                    <p className="text-slate-600 text-xs font-mono text-center break-all px-2">
                        {finalPath}
                    </p>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2.5 w-full mt-1">
                    <button
                        onClick={() => window.electronAPI.openFileDirectory(finalPath)}
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

// ── Recent clip card ──────────────────────────────────────────────────────────
function ClipCard ({ clip }) {
    return (
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl overflow-hidden group cursor-pointer hover:border-slate-600/60 transition-all duration-200">
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
export default function Dashboard ({ user, currentStage, onLogout }) {
    const [dismissed, setDismissed]   = useState(false)
    const [obsStatus, setObsStatus]   = useState('checking') // checking | connected | disconnected
    const [hotkey, setHotkey]         = useState('F5')
    const [recentClips, setRecentClips] = useState([])
    const [stats, setStats]           = useState({ today: 0, week: 0 })

    const isCompleted   = currentStage?.status === 'completed' && !dismissed
    const finalPath     = currentStage?.path || ''
    const showProcessing = currentStage && currentStage.status !== 'completed'

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

    return (
        <>
            <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-3">
                <div className="relative w-full h-[calc(100vh-1.5rem)] bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl overflow-hidden flex flex-col px-6 py-5 gap-4">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between w-full">
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <svg viewBox="0 0 24 24" className="w-7 h-7 text-slate-300" fill="currentColor">
                                <path d="M15 3H9L4 8v8l5 5h6l5-5V8l-5-5zm-3 13a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
                            </svg>
                            <span className="text-slate-100 text-lg font-serif tracking-widest uppercase">Stream Buddy</span>
                        </div>

                        {/* Profile */}
                        <button
                            onClick={onLogout}
                            className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600/50 flex items-center justify-center hover:border-rose-500/40 hover:bg-slate-600 transition-all duration-200 cursor-pointer group"
                            title="Log out"
                        >
                            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition-colors" />
                        </button>
                    </div>

                    {/* ── Status bar ── */}
                    <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-2.5">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${obsStatus === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <span className="text-slate-300 text-sm">
                                {obsStatus === 'connected' ? 'Status: OBS Connected' : 'Status: OBS Disconnected'}
                            </span>
                        </div>
                        <span className="text-slate-400 text-sm">{hotkey} Hotkey Active</span>
                    </div>

                    {/* ── Main content grid ── */}
                    <div className="flex-1 grid grid-cols-[1fr_380px] gap-4 min-h-0">

                        {/* Left — Recent Clips */}
                        <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5 flex flex-col gap-4 overflow-hidden">
                            <p className="text-slate-400 text-sm font-medium">Recent Clips</p>

                            {recentClips.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <p className="text-slate-600 text-sm">No clips yet — press {hotkey} to create one</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    {recentClips.map(clip => (
                                        <ClipCard key={clip.id} clip={clip} />
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
                    />
                )}
            </AnimatePresence>
        </>
    )
}