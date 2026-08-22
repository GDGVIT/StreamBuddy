import { useState } from 'react'
import supabase from '../lib/supabase'

export default function NamingStep ({ onDone }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit (e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await supabase.auth.updateUser({ data: { username: name.trim() } })
    setSaving(false)
    onDone(name.trim())
  }

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-3">
      <div className="relative w-full h-[calc(100vh-1.5rem)] bg-linear-to-br from-slate-800 to-slate-950 rounded-2xl flex items-center justify-center">
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-5 max-w-md">
          <h1 className="text-slate-100 text-2xl font-serif">What should we call you?</h1>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            placeholder="Your name"
            className="w-full bg-slate-900/60 border border-slate-600/50 rounded-full px-6 py-3 text-slate-200 text-center outline-none focus:border-slate-400/60"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium rounded-xl cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Continue →'}
          </button>
        </form>
      </div>
    </div>
  )
}