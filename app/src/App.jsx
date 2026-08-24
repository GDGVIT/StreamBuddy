import { useEffect, useState } from "react"
import Auth from "./components/Auth"
import Dashboard from "./components/Dashboard"
import Onboarding from "./components/Onboarding"
import NamingStep from "./components/NamingStep"
import supabase from "./lib/supabase"
import './index.css'

// app state: 'loading' | 'auth' | 'onboarding' | 'naming' | 'dashboard'

export default function App () {
  const [appState, setAppState] = useState('loading')
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [currentStage, setCurrentStage] = useState(null)

  // Check onboarding status once user logs in
  async function handleAuthSuccess (loggedInUser) {
    setUser(loggedInUser)
    setUsername(loggedInUser?.user_metadata?.username || '')
    const status = await window.electronAPI.getOnboardingStatus(loggedInUser.id)
    if (!status.complete) {
      setAppState('onboarding')
    } else if (!loggedInUser?.user_metadata?.username) {
      setAppState('naming')
    } else {
      setAppState('dashboard')
    }
  }

  function handleOnboardingComplete () {
    setAppState(username ? 'dashboard' : 'naming')
  }

  useEffect(() => {
    // Listen for pipeline stage updates from main process
    window.electronAPI.onStageUpdate((event, stage) => {
      setCurrentStage(stage)
    })

    // Listen for OBS errors
    window.electronAPI.onObsError((event, message) => {
      console.error('OBS Error:', message)
      // You can show a toast here later
    })

    // Start at auth screen
    setAppState('auth')
  }, [])

  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      {appState === 'auth' && (
        <Auth onAuthSuccess={handleAuthSuccess} />
      )}

      {appState === 'onboarding' && (
        <Onboarding user={user} onComplete={handleOnboardingComplete} />
      )}

      {appState === 'naming' && (
        <NamingStep onDone={(name) => { setUsername(name); setAppState('dashboard') }} />
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