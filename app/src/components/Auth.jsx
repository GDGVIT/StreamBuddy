import { useEffect, useState } from 'react'
import supabase from '../lib/supabase'
import Decorations from './ui/Decorations'

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
// import googleLogo from '../assets/google-g.svg'  // add Google's official "G" asset here

// ── Decorations ───────────────────────────────────────────────────────────────
// Positions are measured from the Figma frame, as a % of the panel each shape
// sits in, so the layout scales with the window. Later items are drawn on top.
// `rotate` spins the shape; `shadow` adds a hard black shadow that stays
// pointing the same way on screen no matter how the shape is rotated.
const LEFT_PANEL_DECOR = [
  { src: gridPatch, left: '0.2%', top: '-0.9%', width: '31%' },
  { src: squiggle, left: '-23.6%', top: '-11.1%', width: '62.4%', rotate: '174deg' },
  { src: squareShadowRight, left: '9.7%', top: '14.9%', width: '27%' },
  { src: triangle, left: '53.9%', top: '3.1%', width: '25.2%' },
  { src: yellowWave, left: '45.3%', top: '3.9%', width: '90.1%', rotate: '-120deg', shadow: '-0.4vw 1.4vw' },
  { src: greenShard, left: '0.2%', top: '48.3%', width: '28.9%' },
  { src: limeBar, left: '72.4%', top: '53.7%', width: '34%' },
  { src: gridPatch, left: '66%', top: '76%', width: '31%' },
  { src: squareShadowLeft, left: '54.1%', top: '65.4%', width: '30.6%' },
  { src: peachHexagon, left: '82%', top: '88.9%', width: '28.6%' },
  { src: rainbowArcs, left: '0', top: '76.7%', width: '49.2%' }
]

const RIGHT_PANEL_DECOR = [
  { src: eyes, left: '3.4%', top: '7.1%', width: '12.3%' },
  { src: peachCircle, right: '0', bottom: '0', width: '15.7%' },
  // zIndex lifts the sparkle above the form card it overlaps
  { src: sparkle, left: '74.7%', top: '3.9%', width: '19.1%', zIndex: 20, shadow: '1vw 0.2vw' }
]

// ── Building blocks (the "chunky" hard-shadow style) ─────────────────────────
function Card ({ children, className = '' }) {
  return (
    <div className={`rounded-[0.9vw] border-[0.45vw] border-black bg-auth-card shadow-[1.1vw_1.1vw_0_#000] ${className}`}>
      {children}
    </div>
  )
}

function TextInput (props) {
  return (
    <input
      {...props}
      className="block h-[3.75vw] w-[38vw] rounded-[0.75vw] bg-white px-[1.2vw] text-[1.65vw] text-black shadow-[0.55vw_0.55vw_0_#000] outline-none placeholder:text-neutral-900 focus-visible:ring-[0.25vw] focus-visible:ring-auth-bg"
    />
  )
}

function ChunkyButton ({ color = 'bg-auth-yellow', className = '', ...props }) {
  return (
    <button
      {...props}
      className={`flex h-[2.9vw] cursor-pointer items-center justify-center gap-[0.6vw] rounded-[0.3vw] text-[1.45vw] text-black shadow-[0.45vw_0.45vw_0_#000] transition-transform active:translate-x-[0.3vw] active:translate-y-[0.3vw] active:shadow-[0.15vw_0.15vw_0_#000] disabled:cursor-not-allowed disabled:opacity-60 ${color} ${className}`}
    />
  )
}

function StatusMessage ({ error, info }) {
  if (error) return <p role="alert" className="mt-[1vw] text-[1.1vw] text-red-700">{error}</p>
  if (info) return <p className="mt-[1vw] text-[1.1vw] text-black">{info}</p>
  return null
}

// ── Login view ────────────────────────────────────────────────────────────────
function LoginForm ({ onAuthSuccess, onShowSignUp }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  async function handleSubmit (e) {
    e.preventDefault()
    setErrorMessage('')
    setInfoMessage('')

    if (!email || !password) {
      setErrorMessage('Please fill in both your email and password!')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setErrorMessage(error.message)
        return
      }
      onAuthSuccess(data.user, data.session)
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // TODO: needs a reset-password screen (Supabase emails a link that must land somewhere)
  function handleForgotPassword () {
    setErrorMessage('')
    setInfoMessage('Password reset isn\'t available yet.')
  }

  // TODO: Google OAuth in Electron needs a deep-link redirect back into the app
  function handleGoogle () {
    setErrorMessage('')
    setInfoMessage('Google sign-in isn\'t available yet.')
  }

  return (
    <div className="flex flex-col gap-[1.9vw]">
      <Card className="flex flex-col items-center pb-[2.4vw] pt-[5.3vw]">
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
            style={{ marginTop: '2vw' }}
          />
          <button
            type="button"
            onClick={handleForgotPassword}
            className="mt-[0.9vw] ml-[1.4vw] cursor-pointer self-start text-[0.6vw] text-black underline"
          >
            Forgot Password
          </button>
          <ChunkyButton type="submit" disabled={loading} className="mt-[0.4vw] w-[16.7vw]">
            Login
          </ChunkyButton>
          <StatusMessage error={errorMessage} info={infoMessage} />
        </form>
      </Card>

      <Card className="flex flex-col items-center pb-[1.5vw] pt-[1.8vw]">
        <ChunkyButton type="button" onClick={handleGoogle} className="w-[33vw] h-[3.3vw]">
          Continue with Google
          {/* <img src={googleLogo} alt="" className="h-[1.8vw] w-[1.8vw]" /> */}
        </ChunkyButton>
        <p className="my-[0.8vw] text-[1.4vw] text-black">OR</p>
        <ChunkyButton type="button" color="bg-auth-green" onClick={onShowSignUp} className="w-[33vw] h-[3.2vw]">
          Don&apos;t have an Account Sign Up
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
  const [infoMessage, setInfoMessage] = useState('')

  async function handleSubmit (e) {
    e.preventDefault()
    setErrorMessage('')
    setInfoMessage('')

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
      } else {
        setInfoMessage('Please confirm your email!')
      }
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col items-center pb-[2.4vw] pt-[5.2vw]">
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-[3.3vw]">
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
        <ChunkyButton type="submit" disabled={loading} className="w-[23.2vw]">
          Create New Account
        </ChunkyButton>
      </form>
      <StatusMessage error={errorMessage} info={infoMessage} />
      {/* Not in the mockup, but without it there's no way back to login */}
      <button
        type="button"
        onClick={onShowLogin}
        className="mt-[1.2vw] cursor-pointer text-[0.9vw] text-black underline"
      >
        Already have an account? Log in
      </button>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Auth ({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true)

  // Restore an existing session on launch
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        onAuthSuccess(data.session.user, data.session)
      }
    })
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden font-display">
      {/* Left decorative panel */}
      <div className="relative h-full w-[34.7%] shrink-0 overflow-hidden border-r-[0.25vw] border-black bg-auth-bg">
        <Decorations items={LEFT_PANEL_DECOR} />
      </div>

      {/* Right panel: grid background + form */}
      <div className="relative h-full flex-1 overflow-hidden">
        <img src={gridBackground} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <Decorations items={RIGHT_PANEL_DECOR} />

        <div className="absolute left-[11.5%] top-[16.5%] z-10 w-[75.4%]">
          {isLogin
            ? <LoginForm onAuthSuccess={onAuthSuccess} onShowSignUp={() => setIsLogin(false)} />
            : <SignUpForm onAuthSuccess={onAuthSuccess} onShowLogin={() => setIsLogin(true)} />}
        </div>
      </div>
    </div>
  )
}
