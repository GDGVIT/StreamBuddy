import { useEffect, useRef, useState } from 'react'
import supabase from '../lib/supabase'
import Decorations from './ui/Decorations'
import Stage from './ui/Stage'
import DialogCard from './ui/DialogCard'

import gridBackground from '../assets/auth-grid.svg'
import gridPatch from '../assets/Group 97.svg'
import squiggle from '../assets/gemini-svg (2) 1.svg'
import squareShadowRight from '../assets/Rectangle 116.svg'
import squareShadowLeft from '../assets/Rectangle 115.svg'
import triangle from '../assets/Group 82.svg'
import yellowWave from '../assets/Vector 32.svg'
import greenShard from '../assets/Group 83.svg'
import limeBar from '../assets/Group 81.svg'
import rainbowArcs from '../assets/Group 96.svg'
import peachHexagon from '../assets/Polygon 9.svg'
import eyes from '../assets/Group 102.svg'
import sparkle from '../assets/Subtract.svg'
import peachCircle from '../assets/Group 103.svg'
import googleLogo from '../assets/google.svg'
import logo from '../assets/img4.svg'

// Must match an entry in Supabase → Authentication → URL Configuration → Redirect URLs,
// and the port main.js listens on
const GOOGLE_REDIRECT_URL = 'http://127.0.0.1:54500/auth/callback'

// ── Decorations ───────────────────────────────────────────────────────────────
// Positions are measured from the Figma frame, as a % of the panel each shape
// sits in, so the layout scales with the window. Later items are drawn on top.
// `rotate` spins the shape; `shadow` adds a hard black shadow that stays
// pointing the same way on screen no matter how the shape is rotated.
const LEFT_PANEL_DECOR = [
  { src: gridPatch, left: '0.2%', top: '-0.9%', width: '31%', pin: 'left top' },
  { src: squiggle, left: '-23.6%', top: '-11.1%', width: '62.4%', rotate: '174deg', pin: 'left top' },
  { src: squareShadowRight, left: '9.7%', top: '14.9%', width: '27%', pin: 'left' },
  { src: triangle, left: '53.9%', top: '3.1%', width: '25.2%' },
  { src: yellowWave, left: '45.3%', top: '3.9%', width: '90.1%', rotate: '-120deg', shadow: '-0.4cqw 1.4cqw' },
  { src: greenShard, left: '0.2%', top: '48.3%', width: '28.9%', pin: 'left' },
  { src: limeBar, left: '72.4%', top: '53.7%', width: '34%' },
  { src: gridPatch, left: '66%', top: '76%', width: '31%' },
  { src: squareShadowLeft, left: '54.1%', top: '65.4%', width: '30.6%' },
  { src: peachHexagon, left: '82%', top: '88.9%', width: '28.6%' },
  { src: rainbowArcs, left: '0', top: '76.7%', width: '49.2%', pin: 'left bottom' }
]

const RIGHT_PANEL_DECOR = [
  { src: eyes, left: '3.4%', top: '7.1%', width: '12.3%' },
  { src: peachCircle, right: '0', bottom: '0', width: '15.7%', pin: 'right bottom' },
  // zIndex lifts the sparkle above the form card it overlaps
  { src: sparkle, left: '74.7%', top: '3.9%', width: '19.1%', zIndex: 20, shadow: '1cqw 0.2cqw' }
]

// ── Building blocks (the "chunky" hard-shadow style) ─────────────────────────
function Card ({ children, className = '' }) {
  return (
    <div className={`rounded-[0.9cqw] border-[0.45cqw] border-black bg-auth-card shadow-[1.1cqw_1.1cqw_0_#000] ${className}`}>
      {children}
    </div>
  )
}

function TextInput (props) {
  return (
    <input
      {...props}
      className="block h-[3.75cqw] w-[38cqw] rounded-[0.75cqw] bg-white px-[1.2cqw] text-[1.65cqw] text-black shadow-[0.55cqw_0.55cqw_0_#000] outline-none placeholder:text-neutral-900 focus-visible:ring-[0.25cqw] focus-visible:ring-auth-bg"
    />
  )
}

function ChunkyButton ({ color = 'bg-auth-yellow', className = '', ...props }) {
  return (
    <button
      {...props}
      className={`flex h-[2.9cqw] cursor-pointer items-center justify-center gap-[0.6cqw] rounded-[0.3cqw] text-[1.45cqw] text-black shadow-[0.45cqw_0.45cqw_0_#000] transition-transform active:translate-x-[0.3cqw] active:translate-y-[0.3cqw] active:shadow-[0.15cqw_0.15cqw_0_#000] disabled:cursor-not-allowed disabled:opacity-60 ${color} ${className}`}
    />
  )
}

function StatusMessage ({ error, info }) {
  if (error) return <p role="alert" className="mt-[1cqw] text-[1.1cqw] text-red-700">{error}</p>
  if (info) return <p className="mt-[1cqw] text-[1.1cqw] text-black">{info}</p>
  return null
}

// ── Google sign-in (shared by login and sign-up) ─────────────────────────────
// Google sign-in finishes in the user's browser:
//   1. ask Supabase for Google's sign-in URL (without navigating this window)
//   2. main.js opens it in the browser and waits for the redirect with a one-time code
//   3. trade the code for a session here, where the PKCE code verifier is stored
// If the tab is closed, the user can click Cancel, click the button again, or wait
// for main.js to give up after 3 minutes.
function useGoogleSignIn (onAuthSuccess, setErrorMessage) {
  const [waiting, setWaiting] = useState(false)
  const attemptRef = useRef(0) // lets a newer click win over an older, still-waiting one

  async function start () {
    const attempt = ++attemptRef.current
    setErrorMessage('')
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: GOOGLE_REDIRECT_URL, skipBrowserRedirect: true }
      })
      if (error) throw error

      setWaiting(true)
      const result = await window.electronAPI.googleSignIn(data.url)
      if (attempt !== attemptRef.current) return // replaced by a newer click
      setWaiting(false)
      if (!result.success) {
        if (!result.cancelled) setErrorMessage(result.error)
        return
      }

      const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.code)
      if (exchangeError) throw exchangeError
      onAuthSuccess(sessionData.user, sessionData.session)
    } catch (err) {
      if (attempt !== attemptRef.current) return
      setWaiting(false)
      setErrorMessage(err.message || 'Google sign-in failed. Please try again.')
    }
  }

  return { start, waiting }
}

// Google's branding rules require a white (or dark/neutral) button behind the "G"
function GoogleButton ({ label, onClick }) {
  return (
    <ChunkyButton type="button" color="bg-white" onClick={onClick} className="w-[33cqw] h-[3.3cqw] font-medium">
      <img src={googleLogo} alt="" className="h-[1.9cqw] w-[1.9cqw]" />
      {label}
    </ChunkyButton>
  )
}

function GoogleWaitingMessage () {
  return (
    <p className="mt-[1cqw] text-[1.1cqw] text-black">
      Finish signing in with Google in your browser…{' '}
      <button type="button" onClick={() => window.electronAPI.cancelGoogleSignIn()} className="cursor-pointer underline">
        Cancel
      </button>
    </p>
  )
}

// Sends the sign-up confirmation email again. Returns the message to show.
async function resendConfirmation (email) {
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  return error
    ? { error: error.message }
    : { info: 'Sent! It can take a minute to arrive. Check spam too.' }
}

// Shown after Create New Account when Supabase needs the email confirmed first
function CheckInboxDialog ({ email, onGoToLogin, onClose }) {
  const [status, setStatus] = useState({})
  const [sending, setSending] = useState(false)

  async function handleResend () {
    setSending(true)
    setStatus(await resendConfirmation(email))
    setSending(false)
  }

  return (
    <DialogCard label="Confirm your email" onClose={onClose} className="w-[42cqw]" bodyClassName="flex flex-col items-center px-[2.8cqw] pb-[2.2cqw] pt-[1.8cqw] text-center text-black">
      <h3 className="text-[2.4cqw] font-bold">Check your <span className="text-sb-purple-ink">inbox</span></h3>
      <p className="mt-[0.8cqw] text-[1.3cqw] leading-[1.45]">
        We sent a confirmation link to <strong>{email}</strong>.
        Click it to activate your account, then come back and log in.
      </p>
      <StatusMessage error={status.error} info={status.info} />
      <div className="mt-[1.6cqw] flex gap-[1.2cqw]">
        <ChunkyButton type="button" color="bg-white" onClick={handleResend} disabled={sending} className="w-[13cqw]">
          {sending ? 'Sending…' : 'Resend Email'}
        </ChunkyButton>
        <ChunkyButton type="button" color="bg-auth-green" onClick={onGoToLogin} className="w-[13cqw]">
          Go to Log In →
        </ChunkyButton>
      </div>
    </DialogCard>
  )
}

// Small underlined text button (Forgot Password / Already have an account?)
const TEXT_LINK = 'cursor-pointer text-[1cqw] text-black underline'

// ── Login view ────────────────────────────────────────────────────────────────
// `prefill` carries the email (and password) over from the sign-up page
function LoginForm ({ prefill, onAuthSuccess, onShowSignUp, onForgotPassword }) {
  const [email, setEmail] = useState(prefill?.email || '')
  const [password, setPassword] = useState(prefill?.password || '')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false) // shows the resend link
  const google = useGoogleSignIn(onAuthSuccess, setErrorMessage)

  async function handleSubmit (e) {
    e.preventDefault()
    setErrorMessage('')
    setInfoMessage('')
    setUnconfirmed(false)

    if (!email || !password) {
      setErrorMessage('Please fill in both your email and password!')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.code === 'email_not_confirmed') {
          setUnconfirmed(true)
          setErrorMessage(`Confirm your email first. We sent a link to ${email}.`)
        } else {
          setErrorMessage(error.message)
        }
        return
      }
      onAuthSuccess(data.user, data.session)
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend () {
    const result = await resendConfirmation(email)
    setErrorMessage(result.error || '')
    setInfoMessage(result.info || '')
    if (result.info) setUnconfirmed(false)
  }

  return (
    <div className="flex flex-col gap-[1.9cqw]">
      <Card className="flex flex-col items-center pb-[2.4cqw] pt-[5.3cqw]">
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <TextInput
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter Your Email"
            aria-label="Email"
            autoComplete="email"
          />
          <TextInput
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            autoComplete="current-password"
            style={{ marginTop: '2cqw' }}
          />
          <button
            type="button"
            onClick={() => onForgotPassword(email)}
            className={`mt-[0.8cqw] ml-[1.4cqw] self-start ${TEXT_LINK}`}
          >
            Forgot Password
          </button>
          <ChunkyButton type="submit" disabled={loading} className="mt-[0.4cqw] w-[16.7cqw]">
            Login
          </ChunkyButton>
          <StatusMessage error={errorMessage} info={infoMessage} />
          {unconfirmed && (
            <button type="button" onClick={handleResend} className={`mt-[0.4cqw] ${TEXT_LINK}`}>
              Resend confirmation email
            </button>
          )}
          {google.waiting && <GoogleWaitingMessage />}
        </form>
      </Card>

      <Card className="flex flex-col items-center pb-[1.5cqw] pt-[1.8cqw]">
        <GoogleButton label="Continue with Google" onClick={google.start} />
        <p className="my-[0.8cqw] text-[1.4cqw] text-black">OR</p>
        <ChunkyButton type="button" color="bg-auth-green" onClick={onShowSignUp} className="w-[33cqw] h-[3.2cqw]">
          Don&apos;t have an Account? Sign Up
        </ChunkyButton>
      </Card>
    </div>
  )
}

// ── Sign-up view ──────────────────────────────────────────────────────────────
function SignUpForm ({ onAuthSuccess, onShowLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false) // the "check your inbox" dialog
  const [accountCreated, setAccountCreated] = useState(false)
  const google = useGoogleSignIn(onAuthSuccess, setErrorMessage)

  // After creating the account, the login page gets both details so the user only has
  // to press Login once they've confirmed. Otherwise just carry over the email typed.
  function goToLogin () {
    onShowLogin(accountCreated ? { email, password } : { email })
  }

  async function handleSubmit (e) {
    e.preventDefault()
    setErrorMessage('')

    if (!email || !password || !confirmPassword) {
      setErrorMessage('Please fill in all three fields!')
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords don\'t match.')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setErrorMessage(error.message)
        return
      }
      if (data.session) {
        onAuthSuccess(data.user, data.session)
      } else if (data.user?.identities?.length === 0) {
        // Supabase's way of saying this email is already registered
        setErrorMessage('That email already has an account. Log in instead.')
      } else {
        setAccountCreated(true)
        setAwaitingConfirmation(true)
      }
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-[1.9cqw]">
      <Card className="flex flex-col items-center pb-[1.1cqw] pt-[2.6cqw]">
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-[1.8cqw]">
          <TextInput
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter Your Email"
            aria-label="Email"
            autoComplete="email"
          />
          <TextInput
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter Password"
            aria-label="Password"
            autoComplete="new-password"
          />
          <TextInput
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            aria-label="Confirm password"
            autoComplete="new-password"
          />
          <ChunkyButton type="submit" disabled={loading} className="w-[23.2cqw]">
            Create New Account
          </ChunkyButton>
        </form>
        <StatusMessage error={errorMessage} />
        {google.waiting && <GoogleWaitingMessage />}
      </Card>

      {/* Mirrors the login page's bottom card, so Google sits in the same spot on both */}
      <Card className="flex flex-col items-center pb-[1.5cqw] pt-[1.8cqw]">
        <GoogleButton label="Sign up with Google" onClick={google.start} />
        <p className="my-[0.8cqw] text-[1.4cqw] text-black">OR</p>
        <ChunkyButton type="button" color="bg-auth-green" onClick={goToLogin} className="w-[33cqw] h-[3.2cqw]">
          Already have an Account? Log In
        </ChunkyButton>
      </Card>

      {awaitingConfirmation && (
        <CheckInboxDialog email={email} onGoToLogin={goToLogin} onClose={() => setAwaitingConfirmation(false)} />
      )}
    </div>
  )
}

// ── Reset-password view ───────────────────────────────────────────────────────
// A desktop app has nowhere for an emailed reset *link* to land, so Supabase emails a
// one-time code instead (the "Reset Password" email template must include {{ .Token }}).
//   1. resetPasswordForEmail sends the code
//   2. verifyOtp checks it, which signs the user in
//   3. updateUser sets the new password, then they go straight into the app
function ResetPasswordForm ({ initialEmail, onAuthSuccess, onBack }) {
  const [step, setStep] = useState('email') // email | code
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // Kept once the code is accepted, so a rejected password (e.g. too short) can be
  // retried without the code, which only works once
  const [verifiedSession, setVerifiedSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  async function sendCode (e) {
    e?.preventDefault()
    setErrorMessage('')
    setInfoMessage('')
    if (!email) {
      setErrorMessage('Please enter your email!')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
      if (error) {
        setErrorMessage(error.message)
        return
      }
      setStep('code')
      // Same message whether or not the account exists, so this can't be used to
      // find out which emails are registered
      setInfoMessage(`If ${email.trim()} has an account, a code is on its way. Check spam too.`)
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword (e) {
    e.preventDefault()
    setErrorMessage('')
    setInfoMessage('')
    if (!code || !password || !confirmPassword) {
      setErrorMessage('Please fill in all three fields!')
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords don\'t match.')
      return
    }

    try {
      setLoading(true)
      let session = verifiedSession
      if (!session) {
        const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' })
        if (error) {
          setErrorMessage(error.message)
          return
        }
        session = data.session
        setVerifiedSession(session)
      }
      const { data, error } = await supabase.auth.updateUser({ password })
      if (error) {
        setErrorMessage(error.message)
        return
      }
      onAuthSuccess(data.user, session)
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-[1.9cqw]">
      <Card className="flex flex-col items-center pb-[1.4cqw] pt-[2.4cqw]">
        <h2 className="text-[2.2cqw] font-bold text-black">Reset your password</h2>
        {step === 'email'
          ? (
            <form onSubmit={sendCode} className="mt-[1.6cqw] flex flex-col items-center gap-[1.8cqw]">
              <p className="mb-[-0.6cqw] text-[1.25cqw] text-black">We&apos;ll email you a code to reset it.</p>
              <TextInput
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter Your Email"
                aria-label="Email"
                autoComplete="email"
              />
              <ChunkyButton type="submit" disabled={loading} className="w-[16.7cqw]">
                {loading ? 'Sending…' : 'Send Code'}
              </ChunkyButton>
            </form>
            )
          : (
            <form onSubmit={resetPassword} className="mt-[1.6cqw] flex flex-col items-center gap-[1.8cqw]">
              <TextInput
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder={verifiedSession ? 'Code accepted' : 'Enter the code from your email'}
                aria-label="Code from email"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                disabled={Boolean(verifiedSession)}
              />
              <TextInput
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="New Password"
                aria-label="New password"
                autoComplete="new-password"
              />
              <TextInput
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                aria-label="Confirm new password"
                autoComplete="new-password"
              />
              <ChunkyButton type="submit" disabled={loading} className="w-[23.2cqw]">
                {loading ? 'Saving…' : 'Reset Password'}
              </ChunkyButton>
            </form>
            )}
        <StatusMessage error={errorMessage} info={infoMessage} />
        {step === 'code' && !verifiedSession && (
          <button type="button" onClick={() => sendCode()} disabled={loading} className={`mt-[0.8cqw] ${TEXT_LINK}`}>
            Didn&apos;t get it? Send a new code
          </button>
        )}
      </Card>

      <Card className="flex flex-col items-center py-[1.5cqw]">
        <ChunkyButton type="button" color="bg-auth-green" onClick={onBack} className="w-[33cqw] h-[3.2cqw]">
          Remembered it? Back to Log In
        </ChunkyButton>
      </Card>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Auth ({ onAuthSuccess }) {
  const [view, setView] = useState('login') // login | signup | reset
  const [resetEmail, setResetEmail] = useState('')
  const [prefill, setPrefill] = useState(null) // { email, password? } from the sign-up page

  // Restore an existing session on launch
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        onAuthSuccess(data.session.user, data.session)
      }
    })
  }, [])

  return (
    <Stage className="bg-[linear-gradient(90deg,var(--color-auth-bg)_50%,white_50%)] font-display" canvasClassName="bg-white">
      <div className="flex h-full w-full">
        {/* Left decorative panel. Its background and clipping reach the window's
            left, top and bottom edges, so nothing stops at the 16:9 canvas. */}
        <div className="relative h-full w-[34.7%] shrink-0">
          <div className="absolute bottom-[calc((100cqh-100vh)/2)] left-[calc((100cqw-100vw)/2)] right-0 top-[calc((100cqh-100vh)/2)] overflow-hidden border-r-[0.25cqw] border-black bg-auth-bg">
            <div className="absolute bottom-[calc((100vh-100cqh)/2)] left-[calc((100vw-100cqw)/2)] right-0 top-[calc((100vh-100cqh)/2)]">
              <Decorations items={LEFT_PANEL_DECOR} />
            </div>
          </div>
        </div>

        {/* Right panel: grid background + form */}
        <div className="relative h-full flex-1">
          <div className="absolute bottom-[calc((100cqh-100vh)/2)] left-0 right-[calc((100cqw-100vw)/2)] top-[calc((100cqh-100vh)/2)] overflow-hidden bg-white">
            <img src={gridBackground} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute bottom-[calc((100vh-100cqh)/2)] left-0 right-[calc((100vw-100cqw)/2)] top-[calc((100vh-100cqh)/2)]">
              <Decorations items={RIGHT_PANEL_DECOR} />
            </div>
          </div>
          <img src={logo} alt="StreamBuddy" className="absolute left-[49.2%] top-[2.3cqw] w-[21cqw] -translate-x-1/2 brightness-0" />

          <div className="absolute left-[11.5%] top-[16.5%] z-10 w-[75.4%]">
            {view === 'login' && (
              <LoginForm
                prefill={prefill}
                onAuthSuccess={onAuthSuccess}
                onShowSignUp={() => setView('signup')}
                onForgotPassword={email => { setResetEmail(email); setView('reset') }}
              />
            )}
            {view === 'signup' && <SignUpForm onAuthSuccess={onAuthSuccess} onShowLogin={details => { setPrefill(details); setView('login') }} />}
            {view === 'reset' && <ResetPasswordForm initialEmail={resetEmail} onAuthSuccess={onAuthSuccess} onBack={() => setView('login')} />}
          </div>
        </div>
      </div>
    </Stage>
  )
}
