import { useState, useEffect, useRef } from 'react'
import { RotateCw, ChevronRight } from 'lucide-react'
import WindowCard from './ui/WindowCard'
import StepBadge from './ui/StepBadge'
import ChunkyButton from './ui/ChunkyButton'
import Decorations from './ui/Decorations'
import Stage from './ui/Stage'
import DirectoryModal from './modals/DirectoryModal'
import { explainError } from './errorHelp'

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
  { src: pinkCloud, left: '34.3%', top: '83.4%', width: '14.6%', pin: 'bottom' }
]
const PAGE_DECOR = [
  { src: pinkStripedBlob, left: '19.1%', top: '0', width: '18.9%', pin: 'top' },
  { src: lavenderWave, left: '0', top: '64%', width: '7.2%', pin: 'left' },
  { src: lavenderBlob, left: '90.8%', top: '0.6%', width: '9%', pin: 'right top' },
  { src: hand, left: '90.8%', top: '84.9%', width: '8.7%', pin: 'right' }
]
// Only shown once OBS is connected; sits on top of the window card
const CONNECTED_DECOR = [
  { src: happyBlob, left: '82.3%', top: '59.1%', width: '15.3%', zIndex: 20 }
]

const SIDEBAR_STEPS = [
  { key: 'login', title: 'Login', desc: 'Login to your account to access your setting, preference, and previously saved configuration', top: '9.5cqw' },
  { key: 'obs', title: 'OBS Connection', desc: 'Connect StreamBuddy to OBS Studio and verify your replay buffer is ready for capturing clips.', top: '19.9cqw' },
  { key: 'hotkey', title: 'Configure Hotkey', desc: 'Choose the keyboard shortcut that instantly captures your best moments while you’re streaming.', top: '30.1cqw' },
  { key: 'folder', title: 'Select Output Folder', desc: 'Choose where your generated clips, subtitles, and exported videos will be saved.', top: '41.8cqw' }
]

// Keys that keep their normal job (keyboard navigation) instead of becoming the hotkey
const IGNORED_KEYS = ['Control', 'Shift', 'Alt', 'Meta', 'Tab', 'Enter', 'Escape']

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar ({ statusFor }) {
  return (
    <aside className="absolute inset-y-0 left-0 w-[38.9cqw]">
      {/* Background reaches the window's left, top and bottom edges when the window isn't 16:9 */}
      <div className="absolute bottom-[calc((100cqh_-_100vh)_/_2)] left-[calc((100cqw_-_100vw)_/_2)] right-0 top-[calc((100cqh_-_100vh)_/_2)] rounded-r-[1.4cqw] bg-sb-lavender shadow-[1.4cqw_0_0_#000]" />
      <img src={logo} alt="StreamBuddy" className="absolute left-[1.67cqw] top-[2.03cqw] w-[20.9cqw] brightness-0" />

      <ol>
        {SIDEBAR_STEPS.map((step, i) => {
          const status = statusFor(i)
          return (
            <li
              key={step.key}
              aria-current={status === 'active' ? 'step' : undefined}
              className="absolute left-[6.2cqw] flex gap-[1.3cqw]"
              style={{ top: step.top }}
            >
              <StepBadge number={i + 1} status={status} className="mt-[0.4cqw] h-[3cqw] w-[3.2cqw] text-[2cqw]" />
              <div>
                <h3 className="text-[1.75cqw] font-bold leading-[1.2] underline underline-offset-[0.25cqw]">{step.title}</h3>
                <p className="mt-[0.35cqw] max-w-[24.6cqw] font-body text-[1cqw] leading-[1.35cqw] text-[#3a3a3a]">{step.desc}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}

// ── Pieces shared by the step cards ───────────────────────────────────────────
function StepHeader ({ title, children, descWidth = 'max-w-[31cqw]' }) {
  return (
    <>
      <h2 className="text-[2.7cqw] font-bold leading-[1.2]">{title}</h2>
      <p className={`mt-[1cqw] font-body text-[1.25cqw] leading-[1.67cqw] text-[#3a3a3a] ${descWidth}`}>{children}</p>
    </>
  )
}

function ErrorBox ({ children }) {
  return (
    <div className="mt-[1cqw] min-h-[4.8cqw] w-[30.5cqw] rounded-[0.35cqw] bg-sb-lime px-[0.7cqw] py-[0.6cqw] text-[1.1cqw] font-bold leading-[1.4]">
      {children}
    </div>
  )
}

function RetryButton ({ onClick, className = '' }) {
  return (
    <ChunkyButton
      onClick={onClick}
      className={`h-[2.9cqw] w-[9.2cqw] rounded-[0.35cqw] bg-sb-yellow text-[1.5cqw] shadow-[0.3cqw_0.3cqw_0_#000] ${className}`}
    >
      Retry <RotateCw className="h-[1.5cqw] w-[1.5cqw]" strokeWidth={3} />
    </ChunkyButton>
  )
}

function NextButton ({ onClick, label = 'Next \u2192', className = '' }) {
  return (
    <ChunkyButton
      onClick={onClick}
      className={`h-[3.1cqw] min-w-[9.2cqw] rounded-[0.35cqw] bg-sb-green px-[1.2cqw] text-[1.65cqw] shadow-[0.3cqw_0.3cqw_0_#000] ${className}`}
    >
      {label}
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
      className="flex h-[2.15cqw] w-full shrink-0 cursor-pointer items-center justify-between bg-sb-titlebar-error pl-[2.87cqw] pr-[0.8cqw] text-[1.05cqw] font-bold text-black"
    >
      More Info
      <ChevronRight className={`h-[1.8cqw] w-[1.8cqw] transition-transform ${open ? 'rotate-90' : ''}`} strokeWidth={2.5} />
    </button>
  )
}

function ErrorDetails ({ error, open, context }) {
  if (!open || !error) return null
  const help = explainError(error.details, context)
  return (
    <div className="mb-[1cqw] mt-[1.2cqw] rounded-[0.35cqw] border-[0.12cqw] border-black/20 bg-[#F4F4F4] px-[1.1cqw] py-[0.9cqw]">
      <p className="text-[1.3cqw] font-bold">{help.title}</p>
      <ol className="mt-[0.3cqw] list-decimal pl-[1.4cqw] font-body text-[1.05cqw] leading-[1.45]">
        {help.steps.map(step => <li key={step}>{step}</li>)}
      </ol>
      {error.details && (
        <details className="mt-[0.6cqw]">
          <summary className="cursor-pointer font-body text-[0.9cqw] text-[#555]">Technical details</summary>
          <p className="mt-[0.3cqw] break-all font-mono text-[0.85cqw] text-[#555]">{error.details}</p>
        </details>
      )}
    </div>
  )
}

// Window card used by every step: switches to the grey "error" look when needed
function StepCard ({ error, context, children }) {
  const [showDetails, setShowDetails] = useState(false)
  return (
    <WindowCard
      tone={error ? 'error' : 'dark'}
      bodyClassName={`${showDetails && error ? 'h-[42.6cqw]' : error ? 'h-[30.75cqw]' : 'h-[27.5cqw]'} bg-white`}
      footer={error && <MoreInfoFooter open={showDetails} onToggle={() => setShowDetails(o => !o)} />}
    >
      <div className="relative h-full overflow-y-auto px-[2.87cqw] pt-[0.8cqw]">
        {children}
        <ErrorDetails error={error} open={showDetails} context={context} />
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
      className="mt-[2.4cqw] flex h-[2.75cqw] w-[35.9cqw] items-center gap-[0.84cqw] rounded-[0.35cqw] border-[0.12cqw] border-black/60 bg-sb-green px-[0.9cqw] shadow-[0_0.2cqw_0_#000]"
    >
      {Array.from({ length: filled }, (_, i) => (
        <span key={i} className="h-[1.1cqw] w-[2.4cqw] rounded-[0.25cqw] border-[0.1cqw] border-black/50 bg-sb-yellow" />
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
        details: [result.code, result.error].filter(Boolean).join(' \u2013 ')
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
    <StepCard error={error} context="obs">
      <StepHeader title="Connect OBS Studio">
        We&apos;ll automatically detect OBS Studio and verify that everything is ready for capturing clips.
      </StepHeader>

      <div className="mt-[2.6cqw] flex items-center gap-[1.5cqw]">
        <img src={obsLogo} alt="OBS Studio" className="w-[5.7cqw]" />
        {status === 'failed'
          ? <p className="text-[2.3cqw] font-bold">Couldn&apos;t connect to OBS</p>
          : (
            <ul className="flex flex-col gap-[1.6cqw]" aria-live="polite">
              {OBS_STATUS_LINES[status].map(([lineStatus, label], i) => (
                <li key={label} className="flex items-center gap-[0.5cqw] text-[1.85cqw] font-bold leading-none">
                  <StepBadge number={i + 1} status={lineStatus} className="h-[2.3cqw] w-[2.5cqw] text-[1.5cqw]" />
                  {label}
                </li>
              ))}
            </ul>
            )}
      </div>

      {(status === 'detecting' || status === 'connecting') && <ProgressBar />}
      {status === 'connected' && <NextButton onClick={onNext} className="mt-[2.9cqw]" />}
      {status === 'failed' && (
        <>
          <ErrorBox>{error?.message}</ErrorBox>
          <RetryButton onClick={handleConnect} className="mt-[2.6cqw]" />
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
    <StepCard error={error} context="hotkey">
      <StepHeader title="Configure Hotkey">
        Choose the Keyboard shortcut used to instantly capture the clips while you&apos;re streaming.
      </StepHeader>

      {error
        ? (
          <>
            <p className="mt-[2.2cqw] text-[1.8cqw] font-bold">Couldn&apos;t set that hotkey</p>
            <ErrorBox>{error.message}</ErrorBox>
            <RetryButton onClick={() => setError(null)} className="mt-[1.3cqw]" />
          </>
          )
        : (
          <>
            <p className="mt-[2.2cqw] text-[1.8cqw] font-bold">Current Hotkey</p>
            <kbd className="mt-[1.6cqw] flex h-[4.2cqw] w-[8.7cqw] items-center justify-center rounded-[0.35cqw] border-[0.12cqw] border-black bg-sb-green font-display text-[1.7cqw] font-bold shadow-[0.4cqw_0.4cqw_0_#000]">
              {currentKey}
            </kbd>
            <p className="mt-[1.7cqw] text-[1.8cqw] font-bold">Press Keys to make it a shortcut</p>
            {/* The current key can be kept as-is; after choosing a new one this becomes "Next" */}
            <NextButton
              onClick={onNext}
              label={complete ? 'Next \u2192' : `Keep ${currentKey} \u2192`}
              className="absolute bottom-[1.9cqw] right-[2.1cqw]"
            />
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
      <StepCard error={error} context="folder">
        <StepHeader title="Select Output Folder" descWidth="max-w-[41cqw]">
          Choose where StreamBuddy will save your exported clips and videos.
        </StepHeader>

        <ChunkyButton
          onClick={handleSelect}
          className="mt-[2.3cqw] h-[3.6cqw] w-[19.7cqw] rounded-[0.35cqw] bg-sb-green text-[1.55cqw] shadow-[0.35cqw_0.35cqw_0_#000]"
        >
          Select Output Folder →
        </ChunkyButton>

        {selectedPath && (
          <p
            title={selectedPath}
            className="mt-[1.4cqw] flex h-[2.15cqw] w-[27.4cqw] items-center truncate rounded-[0.25cqw] bg-sb-peach px-[1.3cqw] text-[0.95cqw] font-bold shadow-[0.35cqw_0.35cqw_0_#000]"
          >
            <span className="truncate">Selected Folder: {selectedPath}</span>
          </p>
        )}

        {error && <p className="mt-[2.6cqw] text-[2.65cqw] font-bold leading-tight">{error.message}</p>}
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

  const pageColor = error ? 'bg-sb-pink' : 'bg-sb-yellow'
  return (
    <Stage
      className={`font-display text-black transition-colors duration-300 ${pageColor}`}
      canvasClassName={`transition-colors duration-300 ${pageColor}`}
    >
      <Decorations items={BEHIND_SIDEBAR_DECOR} />
      <Sidebar statusFor={statusFor} />
      <Decorations items={PAGE_DECOR} />
      {step === 'obs' && stepComplete && <Decorations items={CONNECTED_DECOR} />}

      <div className="absolute left-[42.7cqw] top-[8.75cqw] z-10 w-[49.5cqw]">
        {step === 'obs' && <OBSStep {...stepProps} onNext={nextStep} />}
        {step === 'hotkey' && <HotkeyStep {...stepProps} onNext={nextStep} />}
        {step === 'folder' && <FolderStep {...stepProps} userId={user?.id} onFinish={onComplete} />}
      </div>
    </Stage>
  )
}
