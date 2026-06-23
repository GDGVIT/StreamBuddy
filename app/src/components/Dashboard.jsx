import { useState, useEffect } from 'react' // Managed internal reset hook
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle2, Loader2, Circle, LogOut, ExternalLink, X } from 'lucide-react'

const STAGES = [
    { key: 'clipping', label: 'Clipping' },
    { key: 'transcribing', label: 'Transcribing' },
    { key: 'finalising', label: 'Finalising' },
]

function ProcessingIndicator({ currentStage }){
    const currentIndex = STAGES.findIndex(s => s.key === currentStage)

    return (
        <div className="bg-slate-800/70 border border-slate-600/40 rounded-2xl backdrop-blur-sm shadow-xl px-[clamp(1.25rem,2vw,2rem)] py-[clamp(1rem,1.6vw,1.5rem)] w-[clamp(260px,28vw,420px)]">
            <p className="text-slate-400 text-[clamp(0.7rem,0.8vw,0.8rem)] tracking-wide uppercase mb-[clamp(0.75rem,1.2vw,1rem)]">
                Processing
            </p>

            <ul className="flex flex-col gap-[clamp(0.6rem,1vw,0.9rem)]">
                {STAGES.map((stage, index) => {
                    const isComplete = currentIndex > index
                    const isActive = currentIndex === index
                    const isPending = currentIndex < index

                    return (
                        <motion.li
                            key={stage.key}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: isPending ? 0.5 : 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className="flex items-center gap-[clamp(0.5rem,0.8vw,0.75rem)]"
                        >
                            <span className="shrink-0 w-[clamp(1rem,1.3vw,1.25rem)] h-[clamp(1rem,1.3vw,1.25rem)]">
                                {isComplete && (
                                    <CheckCircle2 className="w-full h-full text-emerald-400" />
                                )}
                                {isActive && (
                                    <Loader2 className="w-full h-full text-slate-200 animate-spin" />
                                )}
                                {isPending && (
                                    <Circle className="w-full h-full text-slate-600" />
                                )}
                            </span>

                            <span
                                className={
                                    "text-[clamp(0.85rem,1vw,1rem)] " +
                                    (isComplete ? "text-slate-300" :
                                     isActive ? "text-slate-100 font-medium" :
                                     "text-slate-500")
                                }
                            >
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
        </div>
    )
}

export default function Dashboard({ user, currentStage, onLogout }){
    // Internal visibility gate to track when the user manually closes the completed card
    const [dismissed, setDismissed] = useState(false)

    // Reset the manual dismiss gate whenever a brand-new run initializes
    useEffect(() => {
        if (currentStage && currentStage.status !== 'completed') {
            setDismissed(false)
        }
    }, [currentStage])

    const isCompleted = currentStage?.status === 'completed' && !dismissed
    const finalPath = currentStage?.path || ''
    const showProcessing = currentStage && currentStage.status !== 'completed'

    return(
        <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-3">
            <div className="relative w-full h-[calc(100vh-1.5rem)] bg-linear-to-br from-slate-800 to-slate-950 rounded-2xl overflow-hidden px-[clamp(1.5rem,4vw,4rem)] py-[clamp(1.5rem,3vw,2.5rem)] flex flex-col">
                
                {/* Responsive Header Row */}
                <div className="flex items-center justify-between w-full mb-4">
                    <h1 className="text-slate-200 text-[clamp(1.5rem,1.5vw,3.5rem)] font-serif tracking-wide">
                        Hey <span className='underline underline-offset-4 cursor-pointer'>{user?.email}</span>
                    </h1>
                    
                    <button 
                        onClick={onLogout}
                        className="flex items-center gap-2 text-xl font-medium text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 bg-slate-950/20 px-4 py-2 rounded-xl cursor-pointer transition-all duration-200"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Log Out</span>
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        {showProcessing ? (
                            <motion.div
                                key="processing"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ProcessingIndicator currentStage={currentStage} />
                            </motion.div>
                        ) : isCompleted ? (
                            <motion.div
                                key="completed"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className="relative bg-slate-900/60 border border-slate-700/50 rounded-2xl backdrop-blur-xl shadow-2xl p-8 w-[clamp(320px,34vw,480px)] text-center flex flex-col items-center gap-5"
                            >
                                
                                <button
                                    onClick={() => setDismissed(true)}
                                    className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 cursor-pointer p-1 rounded-lg hover:bg-slate-800/50 transition-colors duration-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full shadow-inner shadow-emerald-500/5">
                                    <CheckCircle2 className="w-9 h-9" />
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-slate-100 font-semibold text-xl tracking-tight">Compilation Complete!</h3>
                                    <p className="text-slate-400 text-lg px-6 py-6 leading-relaxed">Your clip has been processed and saved inside your local library folder.</p>
                                </div>
                                <button 
                                    onClick={() => window.electronAPI.openFileDirectory(finalPath)}
                                    className="w-full mt-1 flex items-center justify-center gap-2 text-sm font-medium text-slate-100 bg-indigo-600 hover:bg-indigo-500 py-3 px-4 rounded-xl cursor-pointer shadow-lg shadow-indigo-600/10 transition-all duration-200 group"
                                >
                                    <span>View Clip</span>
                                    <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.p
                                key="idle"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="text-slate-500 text-[clamp(2rem,2vw,6rem)]"
                            >
                                Press F5 to start processing
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
