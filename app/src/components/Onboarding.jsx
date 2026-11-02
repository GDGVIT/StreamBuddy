import { useState, useEffect } from 'react'

const STEPS = [
  { key: 'obs', label: 'OBS Connection', desc: 'Connect StreamBuddy to OBS Studio and verify your replay buffer is ready for capturing clips.' },
  { key: 'hotkey', label: 'Configure Hotkey', desc: 'Choose the keyboard shortcut that instantly captures your best moments while you\'re streaming.' },
  { key: 'folder', label: 'Select Output Folder', desc: 'Choose where your generated clips, subtitles, and exported videos will be saved.' }
]

// ── Step indicators (sidebar) ─────────────────────────────────────────────────
function StepList ({ currentStep }) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep)
  return (
    <ol>
      {STEPS.map((step, i) => {
        const isComplete = i < currentIndex
        const isActive = i === currentIndex
        const marker = isComplete ? '[done]' : isActive ? '[current]' : '[pending]'
        return (
          <li key={step.key} aria-current={isActive ? 'step' : undefined}>
            <strong>{marker} {step.label}</strong>
            <p>{step.desc}</p>
          </li>
        )
      })}
    </ol>
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
    <div>
      <h2>Connect OBS Studio</h2>
      <p>We&apos;ll automatically detect OBS Studio and verify that everything is ready for capturing clips.</p>

      <p>Status: {status}</p>

      {status !== 'idle' && (
        <p>Looking for OBS.... OBS Detected</p>
      )}

      {(status === 'connecting' || status === 'connected' || status === 'failed') && (
        <p>
          Establishing connection...{' '}
          {status === 'connected'
            ? 'Connected successfully.'
            : status === 'failed'
              ? 'Connection failed. Is OBS open with WebSocket enabled?'
              : 'Connecting...'}
        </p>
      )}

      {status === 'idle' && <button onClick={handleConnect}>Connect to OBS →</button>}
      {status === 'failed' && <button onClick={handleConnect}>Retry Connection</button>}
      {status === 'connected' && <button onClick={onNext}>Continue →</button>}
    </div>
  )
}

// ── Hotkey step ───────────────────────────────────────────────────────────────
function HotkeyStep ({ onNext }) {
  const [currentKey, setCurrentKey] = useState('')
  const [listening, setListening] = useState(false)
  const [saved, setSaved] = useState(false)

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
    <div>
      <h2>Configure Hotkey</h2>
      <p>Choose the keyboard shortcut used to instantly capture clips while you&apos;re streaming.</p>

      <p>Current Hotkey</p>
      <button onClick={() => { setListening(true); setSaved(false) }}>
        {listening ? 'Press any key...' : currentKey || 'F5'}
      </button>
      {!listening && currentKey && <p>Click the button above to change the hotkey</p>}

      {!saved && <button onClick={handleSave}>Save &amp; Continue →</button>}
      {saved && <button onClick={onNext}>Continue →</button>}
    </div>
  )
}

// ── Output folder step ────────────────────────────────────────────────────────
function FolderStep ({ userId, onFinish }) {
  const [selectedPath, setSelectedPath] = useState('')

  useEffect(() => {
    window.electronAPI.getOutputFolder().then(p => setSelectedPath(p || ''))
  }, [])

  async function handleSelect () {
    const result = await window.electronAPI.selectOutputFolder()
    if (result.success) setSelectedPath(result.path)
  }

  async function handleFinish () {
    await window.electronAPI.completeOnboarding(userId)
    onFinish()
  }

  return (
    <div>
      <h2>Select Output Folder</h2>
      <p>Choose where StreamBuddy will save your clips, screenshots, and exported videos.</p>

      <button onClick={handleSelect}>Select Output Folder →</button>
      {selectedPath && <p><code>{selectedPath}</code></p>}

      {selectedPath && <button onClick={handleFinish}>Finish Setup →</button>}
    </div>
  )
}

// ── Main Onboarding component ─────────────────────────────────────────────────
export default function Onboarding ({ user, onComplete }) {
  const [step, setStep] = useState('obs')

  const stepOrder = ['obs', 'hotkey', 'folder']

  function nextStep () {
    const idx = stepOrder.indexOf(step)
    if (idx < stepOrder.length - 1) setStep(stepOrder[idx + 1])
  }

  return (
    <main>
      <aside>
        <h1>Stream Buddy</h1>
        <StepList currentStep={step} />
      </aside>

      <section>
        {step === 'obs' && <OBSStep onNext={nextStep} />}
        {step === 'hotkey' && <HotkeyStep onNext={nextStep} />}
        {step === 'folder' && <FolderStep userId={user?.id} onFinish={onComplete} />}
      </section>
    </main>
  )
}
