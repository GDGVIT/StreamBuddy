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
    <main>
      <form onSubmit={handleSubmit}>
        <h1>What should we call you?</h1>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          placeholder="Your name"
        />
        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Continue →'}
        </button>
      </form>
    </main>
  )
}
