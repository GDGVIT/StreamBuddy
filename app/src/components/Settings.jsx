import { useState, useEffect } from 'react'
import supabase from '../lib/supabase'

const DURATIONS = [30, 60, 90, 120]

export default function Settings ({ user, onClose, onUsernameChange }) {
  const [username, setUsername] = useState(user?.user_metadata?.username || '')
  const [editingUsername, setEditingUsername] = useState(false)
  const [savingUsername, setSavingUsername] = useState(false)

  const [clipDuration, setClipDuration] = useState(60)
  const [currentKey, setCurrentKey] = useState('F5')
  const [listening, setListening] = useState(false)
  const [outputFolder, setOutputFolder] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    window.electronAPI.getHotkey().then(k => setCurrentKey(k || 'F5'))
    window.electronAPI.getOutputFolder().then(p => setOutputFolder(p || ''))
    window.electronAPI.getClipDuration().then(d => setClipDuration(d || 60))
  }, [])

  useEffect(() => {
    if (!listening) return
    function handleKey (e) {
      e.preventDefault()
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return
      const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
      setCurrentKey(key)
      setListening(false)
      window.electronAPI.setHotkey(key)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [listening])

  async function handleUsernameSave () {
    setSavingUsername(true)
    await supabase.auth.updateUser({ data: { username } })
    onUsernameChange?.(username)
    setSavingUsername(false)
    setEditingUsername(false)
  }

  async function handleDurationSelect (d) {
    setClipDuration(d)
    await window.electronAPI.setClipDuration(d)
  }

  async function handleFolderSelect () {
    const result = await window.electronAPI.selectOutputFolder()
    if (result.success) setOutputFolder(result.path)
  }

  async function handleDeleteAccount () {
    setDeleting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const result = await window.electronAPI.deleteAccount(session.access_token)
    setDeleting(false)
    if (result.success) {
      await supabase.auth.signOut()
      window.location.reload()
    } else {
      console.error('Delete failed:', result.error)
    }
  }

  return (
    <main>
      <button onClick={onClose}>← Back</button>
      <h1>Settings</h1>

      {/* Profile */}
      <section>
        <h2>Profile</h2>

        <label>
          Username{' '}
          <input
            value={username}
            disabled={!editingUsername}
            onChange={e => setUsername(e.target.value)}
          />
        </label>
        {editingUsername
          ? (
            <button onClick={handleUsernameSave} disabled={savingUsername}>
              {savingUsername ? 'Saving...' : 'Save'}
            </button>
            )
          : (
            <button onClick={() => setEditingUsername(true)}>Edit</button>
            )}

        <p>
          <label>
            Email <input value={user?.email || ''} disabled />
          </label>
        </p>
      </section>

      {/* Clip Duration */}
      <section>
        <h2>Clip Duration</h2>
        {DURATIONS.map(d => (
          <button
            key={d}
            onClick={() => handleDurationSelect(d)}
            aria-pressed={clipDuration === d}
          >
            {clipDuration === d ? `[${d}s]` : `${d}s`}
          </button>
        ))}
      </section>

      {/* Hotkey */}
      <section>
        <h2>Hotkey</h2>
        <p>Click below and press any key to change your capture shortcut.</p>
        <button onClick={() => setListening(true)}>
          {listening ? 'Press any key...' : currentKey}
        </button>
      </section>

      {/* Output Folder */}
      <section>
        <h2>Output Folder</h2>
        <button onClick={handleFolderSelect}>Select Output Folder</button>
        {outputFolder && <p><code>{outputFolder}</code></p>}
      </section>

      {/* Danger Zone */}
      <section>
        <h2>Danger Zone</h2>
        {!deleteConfirm
          ? (
            <button onClick={() => setDeleteConfirm(true)}>Delete Account</button>
            )
          : (
            <p>
              Are you sure? This can&apos;t be undone.{' '}
              <button onClick={handleDeleteAccount} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button onClick={() => setDeleteConfirm(false)}>Cancel</button>
            </p>
            )}
      </section>
    </main>
  )
}
