import { useState, useEffect } from 'react'
import { ArrowLeft, Pencil, FolderOpen, Trash2 } from 'lucide-react'
import supabase from '../lib/supabase'

const DURATIONS = [30, 60, 90, 120]

export default function Settings({ user, onClose, onUsernameChange }) {
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
    function handleKey(e) {
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

  async function handleUsernameSave() {
    setSavingUsername(true)
    await supabase.auth.updateUser({ data: { username } })
    onUsernameChange?.(username)
    setSavingUsername(false)
    setEditingUsername(false)
  }

  async function handleDurationSelect(d) {
    setClipDuration(d)
    await window.electronAPI.setClipDuration(d)
  }

  async function handleFolderSelect() {
    const result = await window.electronAPI.selectOutputFolder()
    if (result.success) setOutputFolder(result.path)
  }

  async function handleDeleteAccount() {
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
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-3">
      <div className="relative w-full h-[calc(100vh-1.5rem)] bg-linear-to-br from-slate-800 to-slate-950 rounded-2xl overflow-y-auto flex flex-col px-8 py-6 gap-6">

        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center hover:bg-slate-700 transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </button>
          <h1 className="text-slate-100 text-xl font-serif tracking-wide">Settings</h1>
        </div>

        <div className="flex flex-col gap-8 max-w-2xl">

          {/* Profile */}
          <section className="flex flex-col gap-4">
            <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wide border-b border-slate-700/40 pb-2">Profile</h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 text-xs">Username</label>
              <div className="flex items-center gap-2">
                <input
                  value={username}
                  disabled={!editingUsername}
                  onChange={e => setUsername(e.target.value)}
                  className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-lg px-4 py-2 text-sm text-slate-200 outline-none disabled:opacity-60 focus:border-slate-500"
                />
                {editingUsername ? (
                  <button onClick={handleUsernameSave} disabled={savingUsername} className="text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg cursor-pointer">
                    {savingUsername ? 'Saving...' : 'Save'}
                  </button>
                ) : (
                  <button onClick={() => setEditingUsername(true)} className="p-2 text-slate-400 hover:text-slate-200 cursor-pointer">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 text-xs">Email</label>
              <input value={user?.email || ''} disabled className="bg-slate-900/60 border border-slate-700/50 rounded-lg px-4 py-2 text-sm text-slate-500 outline-none" />
            </div>
          </section>

          {/* Clip Duration */}
          <section className="flex flex-col gap-4">
            <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wide border-b border-slate-700/40 pb-2">Clip Duration</h2>
            <div className="flex gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => handleDurationSelect(d)}
                  className={`px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                    clipDuration === d ? 'bg-slate-600 text-slate-100' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </section>

          {/* Hotkey */}
          <section className="flex flex-col gap-4">
            <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wide border-b border-slate-700/40 pb-2">Hotkey</h2>
            <p className="text-slate-500 text-xs">Click below and press any key to change your capture shortcut.</p>
            <div
              onClick={() => setListening(true)}
              className={`w-fit px-6 py-2.5 rounded-xl border text-center font-mono text-lg cursor-pointer transition-all ${
                listening ? 'border-indigo-400 bg-indigo-500/10 text-indigo-300' : 'border-slate-600 bg-slate-800/50 text-slate-100 hover:border-slate-500'
              }`}
            >
              {listening ? 'Press any key...' : currentKey}
            </div>
          </section>

          {/* Output Folder */}
          <section className="flex flex-col gap-4">
            <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wide border-b border-slate-700/40 pb-2">Output Folder</h2>
            <button onClick={handleFolderSelect} className="flex items-center gap-3 w-fit px-5 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600 text-slate-200 text-sm font-medium rounded-xl cursor-pointer transition-all">
              <FolderOpen className="w-4 h-4 text-slate-400" />
              Select Output Folder
            </button>
            {outputFolder && <p className="text-slate-600 text-xs font-mono break-all">{outputFolder}</p>}
          </section>

          {/* Danger Zone */}
          <section className="flex flex-col gap-4 pb-6">
            <h2 className="text-rose-400 text-sm font-semibold uppercase tracking-wide border-b border-rose-900/40 pb-2">Danger Zone</h2>
            {!deleteConfirm ? (
              <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-2 w-fit px-5 py-2.5 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-rose-300 text-sm font-medium rounded-xl cursor-pointer transition-all">
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-rose-300 text-sm">Are you sure? This can&apos;t be undone.</p>
                <button onClick={handleDeleteAccount} disabled={deleting} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm rounded-lg cursor-pointer">
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg cursor-pointer">
                  Cancel
                </button>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}