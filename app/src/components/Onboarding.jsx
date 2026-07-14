import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle2, Loader2, FolderOpen, Keyboard } from 'lucide-react'

const STEPS = [
  { key: 'obs',     label: 'OBS Connection',     desc: 'Connect StreamBuddy to OBS Studio and verify your replay buffer is ready for capturing clips.' },
  { key: 'hotkey',  label: 'Configure Hotkey',   desc: 'Choose the keyboard shortcut that instantly captures your best moments while you\'re streaming.' },
  { key: 'folder',  label: 'Select Output Folder', desc: 'Choose where your generated clips, subtitles, and exported videos will be saved.' },
]

// ── Step indicators (left sidebar) ───────────────────────────────────────────
function StepList ({ currentStep }) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep)
  return (
    <div className="flex flex-col gap-8">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIndex
        const isActive   = i === currentIndex
        return (
          <div key={step.key} className="flex gap-4 items-start">
            <div className={`
              mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300
              ${isComplete ? 'border-emerald-400 bg-emerald-400/10' : isActive ? 'border-slate-400 bg-slate-400/10' : 'border-slate-700 bg-transparent'}
            `}>
              {isComplete
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                : isActive
                ? <Loader2 className="w-3.5 h-3.5 text-slate-300 animate-spin" />
                : <div className="w-2 h-2 rounded-full bg-slate-700" />
              }
            </div>
            <div>
              <p className={`text-sm font-medium transition-colors duration-300 ${isActive ? 'text-slate-100' : isComplete ? 'text-slate-300' : 'text-slate-600'}`}>
                {step.label}
              </p>
              <p className={`text-xs mt-0.5 leading-relaxed transition-colors duration-300 ${isActive ? 'text-slate-400' : 'text-slate-600'}`}>
                {step.desc}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── OBS Connection step ───────────────────────────────────────────────────────
function OBSStep ({ onNext }) {
  const [status, setStatus] = useState('idle') // idle | detecting | connecting | connected | failed

  async function handleConnect () {
    setStatus('detecting')
    await new Promise(r => setTimeout(r, 1000)) // brief pause for UX feel
    setStatus('connecting')

    const result = await window.electronAPI.connectOBS()

    if (result.success) {
      setStatus('connected')
    } else {
      setStatus('failed')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-semibold text-slate-100 underline underline-offset-4 mb-2">Connect OBS Studio</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          We'll automatically detect OBS Studio and verify that everything is ready for capturing clips.
        </p>
      </div>

      {/* OBS Logo */}
      <div className="flex flex-col items-start gap-4 mt-2">
        <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-colors duration-500
          ${status === 'connected' ? 'border-emerald-400' : status === 'failed' ? 'border-rose-500' : 'border-slate-600'}`}>
          <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none">
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" className={status === 'connected' ? 'text-emerald-400' : status === 'failed' ? 'text-rose-400' : 'text-slate-500'} />
            <circle cx="50" cy="50" r="20" fill="currentColor" className={status === 'connected' ? 'text-emerald-400' : status === 'failed' ? 'text-rose-400' : 'text-slate-500'} />
            <path d="M50 5 A45 45 0 0 1 95 50" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-slate-300" />
          </svg>
        </div>

        {/* Status messages */}
        <div className="flex flex-col gap-2">
          {status !== 'idle' && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-slate-200 text-sm font-medium">Looking for OBS....</p>
              <p className="text-slate-500 text-xs">OBS Detected</p>
            </motion.div>
          )}

          {(status === 'connecting' || status === 'connected' || status === 'failed') && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <p className="text-slate-200 text-sm font-medium">Establishing connection...</p>
              <p className={`text-xs ${status === 'connected' ? 'text-emerald-400' : status === 'failed' ? 'text-rose-400' : 'text-slate-500'}`}>
                {status === 'connected' ? 'Connected successfully.' : status === 'failed' ? 'Connection failed. Is OBS open with WebSocket enabled?' : 'Connecting...'}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        {status === 'idle' && (
          <button
            onClick={handleConnect}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium rounded-xl transition-colors duration-200 cursor-pointer"
          >
            Connect to OBS →
          </button>
        )}

        {status === 'failed' && (
          <button
            onClick={handleConnect}
            className="px-6 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-sm font-medium rounded-xl transition-colors duration-200 cursor-pointer"
          >
            Retry Connection
          </button>
        )}

        {status === 'connected' && (
          <button
            onClick={onNext}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium rounded-xl transition-colors duration-200 cursor-pointer"
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  )
}

// ── Hotkey step ───────────────────────────────────────────────────────────────
function HotkeyStep ({ onNext }) {
  const [currentKey, setCurrentKey] = useState('')
  const [listening, setListening]   = useState(false)
  const [saved, setSaved]           = useState(false)

  useEffect(() => {
    window.electronAPI.getHotkey().then(k => setCurrentKey(k || 'F5'))
  }, [])

  useEffect(() => {
    if (!listening) return

    function handleKey (e) {
      e.preventDefault()
      // Ignore pure modifier keys
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return

      const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
      setCurrentKey(key)
      setListening(false)
      setSaved(false)
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [listening])

  async function handleSave () {
    await window.electronAPI.setHotkey(currentKey)
    setSaved(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-semibold text-slate-100 underline underline-offset-4 mb-2">Configure Hotkey</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Choose the keyboard shortcut used to instantly capture clips while you're streaming.
        </p>
      </div>

      <div className="flex flex-col gap-3 mt-2">
        <p className="text-slate-400 text-sm">Current Hotkey</p>

        <div
          onClick={() => { setListening(true); setSaved(false) }}
          className={`
            w-fit min-w-[120px] px-6 py-2.5 rounded-xl border text-center text-slate-100 font-mono text-lg cursor-pointer transition-all duration-200
            ${listening
              ? 'border-indigo-400 bg-indigo-500/10 text-indigo-300'
              : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
            }
          `}
        >
          {listening ? 'Press any key...' : currentKey || 'F5'}
        </div>

        {!listening && currentKey && (
          <p className="text-slate-600 text-xs">Click the box above to change the hotkey</p>
        )}
      </div>

      <div className="flex gap-3">
        {!saved && (
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium rounded-xl transition-colors duration-200 cursor-pointer"
          >
            Save & Continue →
          </button>
        )}

        {saved && (
          <button
            onClick={onNext}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium rounded-xl transition-colors duration-200 cursor-pointer"
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  )
}

// ── Output folder step ────────────────────────────────────────────────────────
function FolderStep ({ onFinish }) {
  const [selectedPath, setSelectedPath] = useState('')

  useEffect(() => {
    window.electronAPI.getOutputFolder().then(p => setSelectedPath(p || ''))
  }, [])

  async function handleSelect () {
    const result = await window.electronAPI.selectOutputFolder()
    if (result.success) setSelectedPath(result.path)
  }

  async function handleFinish () {
    await window.electronAPI.completeOnboarding()
    onFinish()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-semibold text-slate-100 underline underline-offset-4 mb-2">Select Output Folder</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Choose where StreamBuddy will save your clips, screenshots, and exported videos.
        </p>
      </div>

      <div className="flex flex-col gap-3 mt-2">
        <button
          onClick={handleSelect}
          className="flex items-center gap-3 w-fit px-6 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600 hover:border-slate-500 text-slate-200 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer"
        >
          <FolderOpen className="w-4 h-4 text-slate-400" />
          Select Output Folder →
        </button>

        {selectedPath && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-500 text-xs font-mono break-all"
          >
            {selectedPath}
          </motion.p>
        )}
      </div>

      {selectedPath && (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleFinish}
          className="fixed bottom-8 right-8 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium rounded-xl transition-colors duration-200 cursor-pointer"
        >
          Finish Setup →
        </motion.button>
      )}
    </div>
  )
}

// ── Main Onboarding component ─────────────────────────────────────────────────
export default function Onboarding ({ onComplete }) {
  const [step, setStep] = useState('obs')

  const stepOrder = ['obs', 'hotkey', 'folder']

  function nextStep () {
    const idx = stepOrder.indexOf(step)
    if (idx < stepOrder.length - 1) setStep(stepOrder[idx + 1])
  }

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-3">
      <div className="relative w-full h-[calc(100vh-1.5rem)] bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl overflow-hidden flex">

        {/* Left sidebar */}
        <div className="w-[380px] shrink-0 border-r border-slate-700/50 bg-slate-900/40 p-10 flex flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-2 mb-12">
              <span className="text-slate-100 text-xl font-serif tracking-widest uppercase">Stream Buddy</span>
            </div>

            <StepList currentStep={step} />
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 p-12 flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg"
            >
              {step === 'obs'    && <OBSStep    onNext={nextStep} />}
              {step === 'hotkey' && <HotkeyStep onNext={nextStep} />}
              {step === 'folder' && <FolderStep onFinish={onComplete} />}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  )
}