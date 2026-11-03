import { useEffect, useState } from 'react'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Onboarding from './components/Onboarding'
import supabase from './lib/supabase'
import './index.css'

// app state: 'loading' | 'auth' | 'onboarding' | 'dashboard'

// The name shown in Settings: one the user chose, their Google name, or the part of
// their email before the @. It can be changed in Settings → Account.
export function displayName (user) {
  const meta = user?.user_metadata || {}
  return meta.username || meta.full_name || meta.name || (user?.email || '').split('@')[0]
}

export default function App () {
  const [appState, setAppState] = useState('loading')
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [currentStage, setCurrentStage] = useState(null)

  // Check onboarding status once user logs in
  async function handleAuthSuccess (loggedInUser) {
    setUser(loggedInUser)
    setUsername(displayName(loggedInUser))
    const status = await window.electronAPI.getOnboardingStatus(loggedInUser.id)
    setAppState(status.complete ? 'dashboard' : 'onboarding')
  }

  function handleOnboardingComplete () {
    setAppState('dashboard')
  }

  useEffect(() => {
    // Listen for pipeline stage updates from main process
    window.electronAPI.onStageUpdate((event, stage) => {
      setCurrentStage(stage)
    })

    // Listen for OBS errors
    window.electronAPI.onObsError((event, message) => {
      console.error('OBS Error:', message)
    })

    // Start at auth screen
    setAppState('auth')
  }, [])

  if (appState === 'loading') {
    return <p>Loading…</p>
  }

  return (
    <>
      {appState === 'auth' && (
        <Auth onAuthSuccess={handleAuthSuccess} />
      )}

      {appState === 'onboarding' && (
        <Onboarding user={user} onComplete={handleOnboardingComplete} />
      )}

      {appState === 'dashboard' && (
        <Dashboard
          user={user}
          username={username}
          onUsernameChange={setUsername}
          currentStage={currentStage}
          onLogout={async () => {
            await supabase.auth.signOut()
            setUser(null)
            setUsername('')
            setAppState('auth')
          }}
        />
      )}
    </>
  )
}
