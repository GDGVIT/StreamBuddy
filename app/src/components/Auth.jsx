import { useEffect, useState } from 'react'
import supabase from '../lib/supabase'

function LoginForm ({ isLogin, onAuthSuccess, onToggleView }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit (e) {
    e.preventDefault()
    setErrorMessage('')

    if (!email || !password) {
      setErrorMessage('Please fill in both your email and password!')
      return
    }

    let data, error

    try {
      setLoading(true)
      if (isLogin) {
        ({ data, error } = await supabase.auth.signInWithPassword({ email, password }))
      } else {
        ({ data, error } = await supabase.auth.signUp({ email, password }))
      }

      if (error) {
        setErrorMessage(error.message)
        return
      }

      if (data.session) {
        onAuthSuccess(data.user, data.session)
      } else {
        setConfirm(true)
      }
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h2>{isLogin ? 'Log in' : 'Sign up'}</h2>

      {confirm && <p>Please confirm your email!</p>}
      {errorMessage && <p role="alert">{errorMessage}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </div>

        <div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        <button type="submit" disabled={loading}>
          {isLogin ? 'Login' : 'Sign Up'}
        </button>

        <p>
          <button type="button" onClick={onToggleView}>
            {isLogin ? "Don't have an Account? Sign up" : 'Returning user? Log In!'}
          </button>
        </p>
      </form>
    </section>
  )
}

export default function Auth ({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)

  // Restore an existing session on launch
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        onAuthSuccess(data.session.user, data.session)
      }
    })
  }, [])

  function toggleView () {
    setIsLogin(!isLogin)
  }

  useEffect(() => {
    if (session) {
      onAuthSuccess(user, session)
    }
  }, [session])

  function setData (user, session) {
    setUser(user)
    setSession(session)
  }

  return (
    <main>
      <h1>StreamBuddy</h1>
      <LoginForm isLogin={isLogin} onToggleView={toggleView} onAuthSuccess={setData} />
    </main>
  )
}
