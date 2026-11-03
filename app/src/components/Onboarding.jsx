import { useState, useEffect, useRef } from 'react'
import { RotateCw, ChevronRight } from 'lucide-react'
import WindowCard from './ui/WindowCard'
import StepBadge from './ui/StepBadge'
import ChunkyButton from './ui/ChunkyButton'
import Decorations from './ui/Decorations'
import DirectoryModal from './modals/DirectoryModal'

import logo from '../assets/img4.svg'
import obsLogo from '../assets/Obs-Studio-Logo--Streamline-Logos.svg'
import pinkStripedBlob from '../assets/Group 136.svg'
import lavenderWave from '../assets/Group 131.svg'
import lavenderBlob from '../assets/Vector 31.svg'
import pinkCloud from '../assets/Vector.svg'
import hand from '../assets/Group 138.svg'
import happyBlob from '../assets/Group 140.svg'

// ── Layout data ───────────────────────────────────────────────────────────────
// Positions measured from the Figma frames, as a % of the window.
const BEHIND_SIDEBAR_DECOR = [
  { src: pinkCloud, left: '34.3%', top: '83.4%', width: '14.6%' }
]
const PAGE_DECOR = [
  { src: pinkStripedBlob, left: '19.1%', top: '0', width: '18.9%' },
  { src: lavenderWave, left: '0', top: '64%', width: '7.2%' },
  { src: lavenderBlob, left: '90.8%', top: '0.6%', width: '9%' },
  { src: hand, left: '90.8%', top: '84.9%', width: '8.7%' }
]
// Only shown once OBS is connected; sits on top of the window card
const CONNECTED_DECOR = [
  { src: happyBlob, left: '82.3%', top: '59.1%', width: '15.3%', zIndex: 20 }
]

const SIDEBAR_STEPS = [
  { key: 'login', title: 'Login', desc: 'Login to your account to access your setting, preference, and previously saved configuration', top: '9.5vw' },
  { key: 'obs', title: 'OBS Connection', desc: 'Connect StreamBuddy to OBS Studio and verify your replay buffer is ready for capturing clips.', top: '19.9vw' },
  { key: 'hotkey', title: 'Configure Hotkey', desc: 'Choose the keyboard shortcut that instantly captures your best moments while you’re streaming.', top: '30.1vw' },
  { key: 'folder', title: 'Select Output Folder', desc: 'Choose where your generated clips, subtitles, and exported videos will be saved.', top: '41.8vw' }
]

// Keys that keep their normal job (keyboard navigation) instead of becoming the hotkey
const IGNORED_KEYS = ['Control', 'Shift', 'Alt', 'Meta', 'Tab', 'Enter', 'Escape']

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar ({ statusFor }) {
  return (
    <aside className="absolute inset-y-0 left-0 w-[38.9vw] rounded-r-[1.4vw] bg-sb-lavender shadow-[1.4vw_0_0_#000]">
      <img src={logo} alt="StreamBuddy" className="absolute left-[1.67vw] top-[2.03vw] w-[20.9vw] brightness-0" />

      <ol>
        {SIDEBAR_STEPS.map((step, i) => {
          const status = statusFor(i)
          return (
            <li
              key={step.key}
              aria-current={status === 'active' ? 'step' : undefined}
              className="absolute left-[6.2vw] flex gap-[1.3vw]"
              style={{ top: step.top }}
            >
              <StepBadge number={i + 1} status={status} className="mt-[0.4vw] h-[3vw] w-[3.2vw] text-[2vw]" />
              <div>
                <h3 className="text-[1.75vw] font-bold leading-[1.2] underline underline-offset-[0.25vw]">{step.title}</h3>
                <p className="mt-[0.35vw] max-w-[24.6vw] font-body text-[1vw] leading-[1.35vw] text-[#3a3a3a]">{step.desc}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}

// ── Pieces shared by the step cards ───────────────────────────────────────────
function StepHeader ({ title, children, descWidth = 'max-w-[31vw]' }) {
  return (
    <>
      <h2 className="text-[2.7vw] font-bold leading-[1.2]">{title}</h2>
      <p className={`mt-[1vw] font-body text-[1.25vw] leading-[1.67vw] text-[#3a3a3a] ${descWidth}`}>{children}</p>
    </>
  )
}

function ErrorBox ({ children }) {
  return (
    <div className="mt-[1vw] min-h-[4.8vw] w-[30.5vw] rounded-[0.35vw] bg-sb-lime px-[0.7vw] py-[0.6vw] text-[1.1vw] font-bold leading-[1.4]">
      {children}
    </div>
  )
}

function RetryButton ({ onClick, className = '' }) {
  return (
    <ChunkyButton
      onClick={onClick}
      className={`h-[2.9vw] w-[9.2vw] rounded-[0.35vw] bg-sb-yellow text-[1.5vw] shadow-[0.3vw_0.3vw_0_#000] ${className}`}
    >
      Retry <RotateCw className="h-[1.5vw] w-[1.5vw]" strokeWidth={3} />
    </ChunkyButton>
  )
}

function NextButton ({ onClick, className = '' }) {
  return (
    <ChunkyButton
      onClick={onClick}
      className={`h-[3.1vw] w-[9.2vw] rounded-[0.35vw] bg-sb-green text-[1.65vw] shadow-[0.3vw_0.3vw_0_#000] ${className}`}
    >
      Next →
    </ChunkyButton>
  )
}

// Grey "More Info" bar shown under a step card while it's in an error state.
// Clicking it reveals the raw technical error.
function MoreInfoFooter ({ open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex h-[2.15vw] w-full shrink-0 cursor-pointer items-center justify-between bg-sb-titlebar-error pl-[2.87vw] pr-[0.8vw] text-[1.05vw] font-bold text-black"
    >
      More Info
      <ChevronRight className={`h-[1.8vw] w-[1.8vw] transition-transform ${open ? 'rotate-90' : ''}`} strokeWidth={2.5} />
    </button>
  )
}

function ErrorDetails ({ error, open }) {
  if (!open || !error?.details) return null
  return <p className="mt-[0.8vw] font-mono text-[0.95vw] break-all text-[#3a3a3a]">{error.details}</p>
}

// Window card used by every step: switches to the grey "error" look when needed
function StepCard ({ error, children }) {
  const [showDetails, setShowDetails] = useState(false)
  return (
    <WindowCard
      tone={error ? 'error' : 'dark'}
      bodyClassName={`${error ? 'h-[30.75vw]' : 'h-[27.5vw]'} bg-white`}
      footer={error && <MoreInfoFooter open={showDetails} onToggle={() => setShowDetails(o => !o)} />}
    >
      <div className="relative h-full overflow-y-auto px-[2.87vw] pt-[0.8vw]">
        {children}
        <ErrorDetails error={error} open={showDetails} />
      </div>
    </WindowCard>
  )
}

// Animated green bar with yellow segments shown while connecting
function ProgressBar () {
  const [filled, setFilled] = useState(1)
  useEffect(() => {
    const id = setInterval(() => setFilled(f => (f % 10) + 1), 250)
    return () => clearInterval(id)
  }, [])
  return (
    <div
      role="progressbar"
      aria-label="Connecting to OBS"
      className="mt-[2.4vw] flex h-[2.75vw] w-[35.9vw] items-center gap-[0.84vw] rounded-[0.35vw] border-[0.12vw] border-black/60 bg-sb-green px-[0.9vw] shadow-[0_0.2vw_0_#000]"
    >
      {Array.from({ length: filled }, (_, i) => (
        <span key={i} className="h-[1.1vw] w-[2.4vw] rounded-[0.25vw] border-[0.1vw] border-black/50 bg-sb-yellow" />
      ))}
    </div>
  )
}

// ── OBS Connection step ───────────────────────────────────────────────────────
const OBS_STATUS_LINES = {
  detecting: [['active', 'Looking for OBS'], ['pending', 'Waiting to detect OBS']],
  connecting: [['done', 'OBS Detected'], ['active', 'Connecting to OBS']],
  connected: [['done', 'OBS Detected'], ['done', 'OBS Connected']]
}

function OBSStep ({ error, setError, setComplete, onNext }) {
  const [status, setStatus] = useState('detecting') // detecting | connecting | connected | failed
  const started = useRef(false)

  async function handleConnect () {
    setError(null)
    setStatus('detecting')
    await new Promise(r => setTimeout(r, 1000)) // brief pause for UX feel
    setStatus('connecting')

    const result = await window.electronAPI.connectOBS()

    if (result.success) {
      setStatus('connected')
      setComplete(true)
    } else {
      setStatus('failed')
      setError({
        message: 'Make sure OBS is open and its WebSocket server is turned on (port 4455).',
        details: result.error
      })
    }
  }

  // Start detecting as soon as the step appears (the ref stops React StrictMode
  // from running it twice in development)
  useEffect(() => {
    if (started.current) return
    started.current = true
    handleConnect()
  }, [])

  return (
    <StepCard error={error}>
      <StepHeader title="Connect OBS Studio">
        We&apos;ll automatically detect OBS Studio and verify that everything is ready for capturing clips.
      </StepHeader>

      <div className="mt-[2.6vw] flex items-center gap-[1.5vw]">
        <img src={obsLogo} alt="OBS Studio" className="w-[5.7vw]" />
        {status === 'failed'
          ? <p className="text-[2.3vw] font-bold">Couldn&apos;t connect to OBS</p>
          : (
            <ul className="flex flex-col gap-[1.6vw]" aria-live="polite">
              {OBS_STATUS_LINES[status].map(([lineStatus, label], i) => (
                <li key={label} className="flex items-center gap-[0.5vw] text-[1.85vw] font-bold leading-none">
                  <StepBadge number={i + 1} status={lineStatus} className="h-[2.3vw] w-[2.5vw] text-[1.5vw]" />
                  {label}
                </li>
              ))}
            </ul>
            )}
      </div>

      {(status === 'detecting' || status === 'connecting') && <ProgressBar />}
      {status === 'connected' && <NextButton onClick={onNext} className="mt-[2.9vw]" />}
      {status === 'failed' && (
        <>
          <ErrorBox>{error?.message}</ErrorBox>
          <RetryButton onClick={handleConnect} className="mt-[2.6vw]" />
        </>
      )}
    </StepCard>
  )
}

// ── Hotkey step ───────────────────────────────────────────────────────────────
function HotkeyStep ({ error, setError, complete, setComplete, onNext }) {
  const [currentKey, setCurrentKey] = useState('F5')

  useEffect(() => {
    window.electronAPI.getHotkey().then(k => setCurrentKey(k || 'F5'))
  }, [])

  // Any key press on this step becomes the new hotkey (paused while showing an error)
  useEffect(() => {
    if (error) return

    async function handleKey (e) {
      if (IGNORED_KEYS.includes(e.key)) return
      e.preventDefault()

      const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
      setCurrentKey(key)

      const result = await window.electronAPI.setHotkey(key)
      if (result?.success === false) {
        setComplete(false)
        setError({
          message: `"${key}" couldn't be registered as a shortcut. Another app may already be using it — try a different key.`,
          details: result.error
        })
      } else {
        setComplete(true)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [error])

  return (
    <StepCard error={error}>
      <StepHeader title="Configure Hotkey">
        Choose the Keyboard shortcut used to instantly capture the clips while you&apos;re streaming.
      </StepHeader>

      {error
        ? (
          <>
            <p className="mt-[2.2vw] text-[1.8vw] font-bold">Couldn&apos;t set that hotkey</p>
            <ErrorBox>{error.message}</ErrorBox>
            <RetryButton onClick={() => setError(null)} className="mt-[1.3vw]" />
          </>
          )
        : (
          <>
            <p className="mt-[2.2vw] text-[1.8vw] font-bold">Current Hotkey</p>
            <kbd className="mt-[1.6vw] flex h-[4.2vw] w-[8.7vw] items-center justify-center rounded-[0.35vw] border-[0.12vw] border-black bg-sb-green font-display text-[1.7vw] font-bold shadow-[0.4vw_0.4vw_0_#000]">
              {currentKey}
            </kbd>
            <p className="mt-[1.7vw] text-[1.8vw] font-bold">Press Keys to make it a shortcut</p>
            {complete && <NextButton onClick={onNext} className="absolute bottom-[1.9vw] right-[2.1vw]" />}
          </>
          )}
    </StepCard>
  )
}

// ── Output folder step ────────────────────────────────────────────────────────
function FolderStep ({ userId, error, setError, onFinish }) {
  const [selectedPath, setSelectedPath] = useState('')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    window.electronAPI.getOutputFolder().then(p => setSelectedPath(p || ''))
  }, [])

  async function handleSelect () {
    const result = await window.electronAPI.selectOutputFolder()
    if (result.success) {
      setSelectedPath(result.path)
      setError(null)
      setShowModal(true)
    }
  }

  async function handleFinish () {
    try {
      await window.electronAPI.completeOnboarding(userId)
      onFinish()
    } catch (err) {
      setShowModal(false)
      setError({ message: 'Couldn’t save your setup.', details: err.message })
    }
  }

  return (
    <>
      <StepCard error={error}>
        <StepHeader title="Select Output Folder" descWidth="max-w-[41vw]">
          Choose where StreamBuddy will save your exported clips and videos.
        </StepHeader>

        <ChunkyButton
          onClick={handleSelect}
          className="mt-[2.3vw] h-[3.6vw] w-[19.7vw] rounded-[0.35vw] bg-sb-green text-[1.55vw] shadow-[0.35vw_0.35vw_0_#000]"
        >
          Select Output Folder →
        </ChunkyButton>

        {selectedPath && (
          <p
            title={selectedPath}
            className="mt-[1.4vw] flex h-[2.15vw] w-[27.4vw] items-center truncate rounded-[0.25vw] bg-sb-peach px-[1.3vw] text-[0.95vw] font-bold shadow-[0.35vw_0.35vw_0_#000]"
          >
            <span className="truncate">Selected Folder: {selectedPath}</span>
          </p>
        )}

        {error && <p className="mt-[2.6vw] text-[2.65vw] font-bold leading-tight">{error.message}</p>}
      </StepCard>

      {showModal && (
        <DirectoryModal
          variant="selected"
          path={selectedPath}
          onPickFolder={handleSelect}
          onContinue={handleFinish}
        />
      )}
    </>
  )
}

// ── Main Onboarding component ─────────────────────────────────────────────────
export default function Onboarding ({ user, onComplete }) {
  const [step, setStep] = useState('obs')
  const [stepComplete, setStepComplete] = useState(false) // drives the green badge for the current step
  const [error, setError] = useState(null) // { message, details } — turns the page pink

  const stepOrder = ['obs', 'hotkey', 'folder']

  function nextStep () {
    const idx = stepOrder.indexOf(step)
    if (idx < stepOrder.length - 1) {
      setStep(stepOrder[idx + 1])
      setStepComplete(false)
      setError(null)
    }
  }

  // Sidebar badge colour for step i (step 0, Login, is always done by now)
  const currentIndex = SIDEBAR_STEPS.findIndex(s => s.key === step)
  function statusFor (i) {
    if (i < currentIndex) return 'done'
    if (i > currentIndex || error) return 'pending'
    return stepComplete ? 'done' : 'active'
  }

  const stepProps = { error, setError, complete: stepComplete, setComplete: setStepComplete }

  return (
    <div className={`relative h-screen w-screen overflow-hidden font-display text-black transition-colors duration-300 ${error ? 'bg-sb-pink' : 'bg-sb-yellow'}`}>
      <Decorations items={BEHIND_SIDEBAR_DECOR} />
      <Sidebar statusFor={statusFor} />
      <Decorations items={PAGE_DECOR} />
      {step === 'obs' && stepComplete && <Decorations items={CONNECTED_DECOR} />}

      <div className="absolute left-[42.7vw] top-[8.75vw] z-10 w-[49.5vw]">
        {step === 'obs' && <OBSStep {...stepProps} onNext={nextStep} />}
        {step === 'hotkey' && <HotkeyStep {...stepProps} onNext={nextStep} />}
        {step === 'folder' && <FolderStep {...stepProps} userId={user?.id} onFinish={onComplete} />}
      </div>
    </div>
  )
}
