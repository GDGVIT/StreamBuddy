import { useState, useEffect } from 'react'
import { X, Clock3, ChevronRight } from 'lucide-react'
import supabase from '../lib/supabase'
import ChunkyButton from './ui/ChunkyButton'
import Stage from './ui/Stage'
import { DeleteAccountDialog, LogoutDialog } from './AccountDialogs'

import gearIcon from '../assets/Group 216.svg'
import accountIcon from '../assets/ic_outline-account-circle.svg'
import videoIcon from '../assets/iconoven_video-clip.svg'
import folderIcon from '../assets/emojione-v1_open-folder.svg'
import keyIcon from '../assets/Group 277.svg'
import burst from '../assets/Vector 103.svg'

const TABS = [
  { key: 'account', label: 'Account', icon: accountIcon },
  { key: 'duration', label: 'Clip Duration', icon: videoIcon },
  { key: 'folder', label: 'Change Folder', icon: folderIcon },
  { key: 'hotkey', label: 'Hotkey', icon: keyIcon }
]
const DURATIONS = [30, 60, 90, 120]
const IGNORED_KEYS = ['Control', 'Shift', 'Alt', 'Meta', 'Tab', 'Enter', 'Escape']

// Light lavender field used for inputs, duration options and folder rows
const FIELD = 'rounded-[0.6cqw] border-[0.12cqw] border-[#C9A7F5] bg-[#EEDBFC] font-body text-[#555]'

// Log Out / Delete Account, under the Account tab
const ACCOUNT_BUTTON = 'h-[2.9cqw] whitespace-nowrap rounded-[0.5cqw] border-[0.15cqw] border-black px-[1.5cqw] font-body text-[1.3cqw] font-bold tracking-[0.03em] shadow-[0_0.4cqw_0_#000]'

function PanelTitle ({ children }) {
  return <h3 className="text-[2cqw] font-bold leading-tight">{children}</h3>
}

// ── Tab panels ────────────────────────────────────────────────────────────────
function AccountPanel ({ draft, setDraft, email, onLogout, onDelete }) {
  return (
    <div className="flex flex-col gap-[1.3cqw]">
      <div className="flex gap-[2.8cqw]">
        <label className="flex flex-col gap-[0.5cqw]">
          <span className="text-[2cqw] font-bold leading-none">Username</span>
          <input
            value={draft.username}
            onChange={e => setDraft(d => ({ ...d, username: e.target.value }))}
            className={`${FIELD} h-[3.3cqw] w-[19.6cqw] px-[1cqw] text-[1.5cqw] tracking-[0.04em] outline-none focus-visible:border-sb-purple-dark`}
          />
        </label>
        <label className="flex flex-col gap-[0.5cqw]">
          <span className="text-[2cqw] font-bold leading-none">E-mail</span>
          <input value={email} readOnly className={`${FIELD} h-[3.3cqw] w-[23cqw] px-[1cqw] text-[1.5cqw] tracking-[0.04em] outline-none`} />
        </label>
      </div>
      <div className="flex gap-[1.2cqw]">
        <ChunkyButton onClick={onLogout} className={`${ACCOUNT_BUTTON} bg-[#E4D0FD]`}>Log Out</ChunkyButton>
        <ChunkyButton onClick={onDelete} className={`${ACCOUNT_BUTTON} bg-sb-pink`}>Delete Account</ChunkyButton>
      </div>
    </div>
  )
}

function DurationPanel ({ draft, setDraft }) {
  return (
    <>
      <div>
        <PanelTitle>Change Clip Duration</PanelTitle>
        <div className="mt-[1cqw] flex gap-[1.75cqw]" role="radiogroup" aria-label="Clip duration in seconds">
          {DURATIONS.map(d => {
            const active = draft.clipDuration === d
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDraft(prev => ({ ...prev, clipDuration: d }))}
                className={`h-[3.3cqw] w-[7cqw] cursor-pointer text-[1.3cqw] ${active ? 'rounded-[0.6cqw] bg-sb-purple-dark font-body font-bold text-white' : FIELD}`}
              >
                {d}
              </button>
            )
          })}
        </div>
      </div>
      {/* TODO: stopwatch illustration from Figma isn't in assets yet */}
      <div className="absolute right-[2.6cqw] top-1/2 -translate-y-[40%]">
        <img src={burst} alt="" className="absolute -left-[1.6cqw] -top-[1.4cqw] w-[1.9cqw] -scale-x-100" />
        <span className="absolute -top-[0.9cqw] left-1/2 h-[0.7cqw] w-[1.6cqw] -translate-x-1/2 rounded-[0.2cqw] bg-black" />
        <span className="flex h-[5.2cqw] w-[5.2cqw] items-center justify-center rounded-full border-[0.3cqw] border-black bg-[#975DE0] p-[0.35cqw]">
          <span className="flex h-full w-full items-center justify-center rounded-full border-[0.15cqw] border-black bg-[#FEEB6A]">
            <Clock3 className="h-[115%] w-[115%]" strokeWidth={1.4} />
          </span>
        </span>
      </div>
    </>
  )
}

function FolderPanel ({ draft, setDraft }) {
  async function handlePick () {
    const result = await window.electronAPI.pickFolder()
    if (result.success) setDraft(d => ({ ...d, outputFolder: result.path }))
  }

  return (
    <>
      <div>
        <PanelTitle>Change Folder</PanelTitle>
        <button type="button" onClick={handlePick} className={`${FIELD} mt-[0.8cqw] flex h-[2.2cqw] w-[29.3cqw] cursor-pointer items-center gap-[0.6cqw] px-[1cqw] text-[1.15cqw] tracking-[0.04em]`}>
          Select Output Folder <ChevronRight className="h-[1.1cqw] w-[1.1cqw]" />
        </button>
        <button
          type="button"
          onClick={() => draft.outputFolder && window.electronAPI.openFileDirectory(draft.outputFolder)}
          title={draft.outputFolder ? `Show ${draft.outputFolder} in Explorer` : undefined}
          className={`${FIELD} mt-[0.8cqw] flex h-[2.2cqw] w-[29.3cqw] cursor-pointer items-center gap-[0.6cqw] px-[1cqw] text-[1.15cqw] tracking-[0.04em]`}
        >
          <span className="truncate">Selected Folder({draft.outputFolder || 'none yet'})</span>
          <ChevronRight className="h-[1.1cqw] w-[1.1cqw] shrink-0" />
        </button>
      </div>
      <div className="absolute right-[2.6cqw] top-1/2 -translate-y-1/2">
        <img src={folderIcon} alt="" className="w-[6.4cqw] -rotate-12" />
        <img src={burst} alt="" className="absolute -right-[0.6cqw] -top-[0.9cqw] w-[1.9cqw]" />
      </div>
    </>
  )
}

function HotkeyPanel ({ draft, setDraft, listening, setListening }) {
  useEffect(() => {
    if (!listening) return
    function handleKey (e) {
      if (e.key === 'Escape') {
        setListening(false)
        return
      }
      if (IGNORED_KEYS.includes(e.key)) return
      e.preventDefault()
      const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
      setDraft(d => ({ ...d, hotkey: key }))
      setListening(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [listening, setDraft, setListening])

  return (
    <>
      <div>
        <h3 className="text-[1.85cqw] font-bold leading-tight">Configure Hotkey</h3>
        <p className="max-w-[27cqw] font-body text-[1.02cqw] leading-[1.25] text-[#555] tracking-[0.03em]">
          Choose the keyboard shortcut used to instantly capture clips while you&apos;re streaming.
        </p>
        <p className="mt-[0.15cqw] text-[1.02cqw] font-bold leading-[1.3]">Current Hotkey: {draft.hotkey}</p>
        <p className={`font-body text-[1.02cqw] leading-[1.3] tracking-[0.03em] ${listening ? 'font-bold text-sb-purple-dark' : 'text-[#555]'}`}>
          {listening ? 'Listening… press a key (Esc to cancel)' : 'Press any key to change'}
        </p>
        <ChunkyButton
          onClick={() => setListening(l => !l)}
          className="mt-[0.5cqw] h-[2.3cqw] rounded-[0.35cqw] bg-sb-purple-dark px-[1.1cqw] text-[1.15cqw] text-white shadow-[0.2cqw_0.25cqw_0_#000]"
        >
          {listening ? 'Stop' : 'Set Key →'}
        </ChunkyButton>
      </div>
      <img src={keyIcon} alt="" className="absolute right-[2.6cqw] top-1/2 w-[7.2cqw] -translate-y-1/2" />
    </>
  )
}

// ── Settings dialog ───────────────────────────────────────────────────────────
// Changes are kept in a draft and only applied by "Save Changes".
export default function Settings ({ user, username, initialTab = 'account', onClose, onSaved, onUsernameChange, onLogout }) {
  const [tab, setTab] = useState(initialTab)
  const [original, setOriginal] = useState(null)
  const [draft, setDraft] = useState({ username: username || '', clipDuration: 60, outputFolder: '', hotkey: 'F5' })
  const [listening, setListening] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(null) // null | 'logout' | 'delete'
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Load the current settings; pause the global hotkey while this dialog is open
  // (otherwise pressing it here would capture a clip instead of choosing a key)
  useEffect(() => {
    window.electronAPI.setAppReady(false)
    Promise.all([
      window.electronAPI.getHotkey(),
      window.electronAPI.getOutputFolder(),
      window.electronAPI.getClipDuration()
    ]).then(([hotkey, outputFolder, clipDuration]) => {
      const loaded = { username: username || '', hotkey: hotkey || 'F5', outputFolder: outputFolder || '', clipDuration: clipDuration || 60 }
      setOriginal(loaded)
      setDraft(loaded)
    })
    return () => window.electronAPI.setAppReady(true)
  }, [])

  // Escape closes (unless the hotkey picker or a confirmation dialog is using it)
  useEffect(() => {
    if (listening || confirming) return
    function handleKey (e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [listening, confirming, onClose])

  async function handleSave () {
    if (!original) return
    setSaving(true)
    setError('')
    const changes = {}
    try {
      const name = draft.username.trim()
      if (name && name !== original.username) {
        const { error: updateError } = await supabase.auth.updateUser({ data: { username: name } })
        if (updateError) throw updateError
        onUsernameChange?.(name)
      }
      if (draft.clipDuration !== original.clipDuration) {
        const result = await window.electronAPI.setClipDuration(draft.clipDuration)
        if (result?.success === false) throw new Error(`Couldn't update OBS: ${result.error}`)
      }
      if (draft.outputFolder !== original.outputFolder) {
        const result = await window.electronAPI.setOutputFolder(draft.outputFolder)
        if (!result.success) throw new Error(result.error)
        changes.outputFolder = draft.outputFolder
      }
      if (draft.hotkey !== original.hotkey) {
        const result = await window.electronAPI.setHotkey(draft.hotkey)
        if (!result.success) throw new Error(`"${draft.hotkey}" can't be used as a shortcut — another app may already use it.`)
        changes.hotkey = draft.hotkey
      }
      onSaved?.(changes)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount () {
    setDeleting(true)
    setDeleteError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('You\'ve been logged out. Log in again, then try once more.')
      const result = await window.electronAPI.deleteAccount(session.access_token)
      if (!result.success) throw new Error(result.error)
      onLogout() // signs out of the now-deleted account and returns to the login page
    } catch (err) {
      setDeleteError(`Couldn't delete your account: ${err.message}`)
      setDeleting(false)
    }
  }

  const panelProps = { draft, setDraft }

  return (
    <Stage portal role="dialog" aria-modal="true" aria-labelledby="settings-title" data-ui className="z-50 bg-black/60 font-display text-black">
      <div className="absolute inset-0 flex items-center justify-center">
        {/* nudged up-left by half the shadow so the card + shadow sit centred */}
        <div className="w-[55cqw] -translate-x-[0.55cqw] -translate-y-[0.55cqw] overflow-hidden rounded-[1.3cqw] border-[0.33cqw] border-black bg-[#D8BBFC] shadow-[1.1cqw_1.1cqw_0_#000]">
          <header className="flex h-[6.2cqw] items-center justify-between border-b-[0.35cqw] border-black bg-sb-purple-dark pl-[2.4cqw] pr-[1.9cqw]">
            <h2 id="settings-title" className="flex items-center gap-[1.4cqw] text-[2.85cqw] font-bold tracking-[0.04em] text-[#EFE3FF]">
              <img src={gearIcon} alt="" className="w-[4.4cqw]" />
              Settings
            </h2>
            <button type="button" onClick={onClose} aria-label="Close settings" className="flex h-[3.7cqw] w-[3.7cqw] cursor-pointer items-center justify-center rounded-full bg-[#FEEA49]">
              <X className="h-[2.4cqw] w-[2.4cqw]" strokeWidth={1.6} />
            </button>
          </header>

          <div className="px-[2.3cqw] pb-[1.1cqw] pt-[2.4cqw]">
            {/* Tabs */}
            <div role="tablist" aria-label="Settings sections" className="flex items-end justify-between">
              {TABS.map(t => {
                const active = tab === t.key
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => { setTab(t.key); setListening(false) }}
                    className={`flex w-[11.2cqw] cursor-pointer flex-col items-center justify-end gap-[0.3cqw] rounded-t-[0.5cqw] border-x-[0.1cqw] border-b-[0.8cqw] border-t-[0.1cqw] border-black pb-[0.2cqw] font-body font-bold tracking-[0.03em] ${
                      active ? 'h-[7.8cqw] bg-sb-tab-yellow text-[1.5cqw]' : 'h-[7cqw] bg-[#CDA4FC] text-[1.25cqw]'
                    }`}
                  >
                    <img src={t.icon} alt="" className={active ? 'h-[4.2cqw] w-[4.2cqw]' : 'h-[3.6cqw] w-[3.6cqw]'} />
                    {t.label}
                  </button>
                )
              })}
            </div>

            {/* Panel */}
            <div role="tabpanel" className="relative mt-[3cqw] flex h-[13.4cqw] items-center rounded-[1.1cqw] border-[0.4cqw] border-black bg-white px-[2.6cqw] shadow-[0.25cqw_1.1cqw_0_#000]">
              {tab === 'account' && (
                <AccountPanel {...panelProps} email={user?.email || ''} onLogout={() => setConfirming('logout')} onDelete={() => setConfirming('delete')} />
              )}
              {tab === 'duration' && <DurationPanel {...panelProps} />}
              {tab === 'folder' && <FolderPanel {...panelProps} />}
              {tab === 'hotkey' && <HotkeyPanel {...panelProps} listening={listening} setListening={setListening} />}
            </div>

            {/* Footer */}
            <div className="mt-[2.4cqw] flex items-end justify-between gap-[1.5cqw]">
              <div className="min-w-0 flex-1 font-body text-[1cqw] font-bold">
                {error && <p role="alert" className="text-red-700">{error}</p>}
              </div>
              <ChunkyButton
                onClick={onClose}
                className="h-[3.65cqw] w-[12cqw] shrink-0 rounded-[0.6cqw] border-[0.15cqw] border-black bg-[#E4D0FD] font-body text-[1.55cqw] font-medium tracking-[0.05em] shadow-[0_0.6cqw_0_#000]"
              >
                Cancel
              </ChunkyButton>
              <ChunkyButton
                onClick={handleSave}
                disabled={saving || !original}
                className="h-[3.65cqw] w-[14.4cqw] shrink-0 rounded-[0.6cqw] border-[0.15cqw] border-black bg-sb-tab-yellow font-body text-[1.55cqw] font-medium tracking-[0.05em] shadow-[0_0.6cqw_0_#000]"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </ChunkyButton>
            </div>
          </div>
        </div>
      </div>

      {confirming === 'logout' && <LogoutDialog onCancel={() => setConfirming(null)} onConfirm={onLogout} />}
      {confirming === 'delete' && (
        <DeleteAccountDialog
          email={user?.email || ''}
          deleting={deleting}
          error={deleteError}
          onCancel={() => { setConfirming(null); setDeleteError('') }}
          onConfirm={handleDeleteAccount}
        />
      )}
    </Stage>
  )
}
