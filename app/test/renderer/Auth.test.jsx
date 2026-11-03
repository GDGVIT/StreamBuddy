import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Auth from '../../src/components/Auth'
import { fakeSupabase } from '../helpers/fakeSupabase'
import { installElectronAPI } from '../helpers/fakeElectronAPI'

let api, onAuthSuccess, user

beforeEach(() => {
  api = installElectronAPI()
  onAuthSuccess = vi.fn()
  user = userEvent.setup()
})

function renderAuth () {
  return render(<Auth onAuthSuccess={onAuthSuccess} />)
}

describe('session persistence', () => {
  it('signs straight back in with a saved session', async () => {
    const session = { access_token: 't', user: { id: 'u1', email: 'me@x.com' } }
    fakeSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null })
    renderAuth()
    await waitFor(() => expect(onAuthSuccess).toHaveBeenCalledWith(session.user, session))
  })

  it('shows the login form when there is no saved session', async () => {
    renderAuth()
    expect(await screen.findByRole('button', { name: 'Login' })).toBeInTheDocument()
    expect(onAuthSuccess).not.toHaveBeenCalled()
  })
})

describe('login', () => {
  it('asks for both fields before calling Supabase', async () => {
    renderAuth()
    await user.click(screen.getByRole('button', { name: 'Login' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Please fill in both your email and password!')
    expect(fakeSupabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('shows the error Supabase returns', async () => {
    renderAuth()
    await user.type(screen.getByLabelText('Email'), 'me@x.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Login' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
    expect(fakeSupabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'me@x.com', password: 'wrong' })
  })

  it('explains an unconfirmed email and offers to resend the link', async () => {
    fakeSupabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code: 'email_not_confirmed', message: 'Email not confirmed' } })
    renderAuth()
    await user.type(screen.getByLabelText('Email'), 'new@x.com')
    await user.type(screen.getByLabelText('Password'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Login' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirm your email first. We sent a link to new@x.com.')
    await user.click(screen.getByRole('button', { name: 'Resend confirmation email' }))
    expect(fakeSupabase.auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'new@x.com' })
    expect(await screen.findByText(/Sent! It can take a minute/)).toBeInTheDocument()
  })

  it('signs in with the right details', async () => {
    const session = { access_token: 't' }
    fakeSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' }, session }, error: null })
    renderAuth()
    await user.type(screen.getByLabelText('Email'), 'me@x.com')
    await user.type(screen.getByLabelText('Password'), 'right')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(onAuthSuccess).toHaveBeenCalledWith({ id: 'u1' }, session))
  })
})

describe('sign up', () => {
  async function openSignUp () {
    renderAuth()
    await user.click(screen.getByRole('button', { name: 'Don\'t have an Account? Sign Up' }))
  }

  it('switches between login and sign-up with the green button', async () => {
    await openSignUp()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Already have an Account? Log In' }))
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
  })

  it('catches passwords that do not match', async () => {
    await openSignUp()
    await user.type(screen.getByLabelText('Email'), 'new@x.com')
    await user.type(screen.getByLabelText('Password'), 'secret1')
    await user.type(screen.getByLabelText('Confirm password'), 'secret2')
    await user.click(screen.getByRole('button', { name: 'Create New Account' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords don\'t match.')
    expect(fakeSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  async function createAccount (email = 'new@x.com', password = 'secret1') {
    await openSignUp()
    await user.type(screen.getByLabelText('Email'), email)
    await user.type(screen.getByLabelText('Password'), password)
    await user.type(screen.getByLabelText('Confirm password'), password)
    await user.click(screen.getByRole('button', { name: 'Create New Account' }))
  }

  it('asks the user to confirm their email in a dialog', async () => {
    await createAccount()
    const dialog = await screen.findByRole('dialog', { name: 'Confirm your email' })
    expect(within(dialog).getByText('new@x.com')).toBeInTheDocument()
    expect(fakeSupabase.auth.signUp).toHaveBeenCalledWith({ email: 'new@x.com', password: 'secret1' })
  })

  it('fills in the login form after confirming, so the user only presses Login', async () => {
    await createAccount('new@x.com', 'secret1')
    const dialog = await screen.findByRole('dialog', { name: 'Confirm your email' })
    await user.click(within(dialog).getByRole('button', { name: 'Go to Log In →' }))
    expect(screen.queryByRole('dialog', { name: 'Confirm your email' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('new@x.com')
    expect(screen.getByLabelText('Password')).toHaveValue('secret1')
  })

  it('still fills in the details if the dialog was closed first', async () => {
    await createAccount('new@x.com', 'secret1')
    await screen.findByRole('dialog', { name: 'Confirm your email' })
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Already have an Account? Log In' }))
    expect(screen.getByLabelText('Password')).toHaveValue('secret1')
  })

  it('only carries the email over when no account was created', async () => {
    await openSignUp()
    await user.type(screen.getByLabelText('Email'), 'typed@x.com')
    await user.type(screen.getByLabelText('Password'), 'not-submitted')
    await user.click(screen.getByRole('button', { name: 'Already have an Account? Log In' }))
    expect(screen.getByLabelText('Email')).toHaveValue('typed@x.com')
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('can send the confirmation email again', async () => {
    await createAccount()
    const dialog = await screen.findByRole('dialog', { name: 'Confirm your email' })
    await user.click(within(dialog).getByRole('button', { name: 'Resend Email' }))
    expect(fakeSupabase.auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'new@x.com' })
    expect(await within(dialog).findByText(/Sent! It can take a minute/)).toBeInTheDocument()
  })

  it('says when the email already has an account', async () => {
    fakeSupabase.auth.signUp.mockResolvedValue({ data: { user: { id: 'x', identities: [] }, session: null }, error: null })
    await createAccount()
    expect(await screen.findByRole('alert')).toHaveTextContent('That email already has an account. Log in instead.')
    expect(screen.queryByRole('dialog', { name: 'Confirm your email' })).not.toBeInTheDocument()
  })

  it('signs in right away when no confirmation is needed', async () => {
    const session = { access_token: 't' }
    fakeSupabase.auth.signUp.mockResolvedValue({ data: { user: { id: 'new' }, session }, error: null })
    await openSignUp()
    await user.type(screen.getByLabelText('Email'), 'new@x.com')
    await user.type(screen.getByLabelText('Password'), 'secret1')
    await user.type(screen.getByLabelText('Confirm password'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Create New Account' }))
    await waitFor(() => expect(onAuthSuccess).toHaveBeenCalledWith({ id: 'new' }, session))
  })
})

describe('forgot password', () => {
  async function openReset (email = 'me@x.com') {
    renderAuth()
    await user.type(screen.getByLabelText('Email'), email)
    await user.click(screen.getByRole('button', { name: 'Forgot Password' }))
  }

  async function sendCode () {
    await user.click(screen.getByRole('button', { name: 'Send Code' }))
    await screen.findByLabelText('Code from email')
  }

  async function fillReset (code, password) {
    const codeInput = screen.getByLabelText('Code from email')
    if (!codeInput.disabled) {
      await user.clear(codeInput)
      await user.type(codeInput, code)
    }
    await user.clear(screen.getByLabelText('New password'))
    await user.type(screen.getByLabelText('New password'), password)
    await user.clear(screen.getByLabelText('Confirm new password'))
    await user.type(screen.getByLabelText('Confirm new password'), password)
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))
  }

  it('carries over the email typed on the login form', async () => {
    await openReset('typed@x.com')
    expect(screen.getByLabelText('Email')).toHaveValue('typed@x.com')
  })

  it('sends a code without revealing whether the account exists', async () => {
    await openReset()
    await sendCode()
    expect(fakeSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('me@x.com')
    expect(screen.getByText(/If me@x.com has an account, a code is on its way/)).toBeInTheDocument()
  })

  it('only accepts digits in the code box', async () => {
    await openReset()
    await sendCode()
    await user.type(screen.getByLabelText('Code from email'), '12a3-45 6')
    expect(screen.getByLabelText('Code from email')).toHaveValue('123456')
  })

  it('shows Supabase\'s message for a wrong or expired code', async () => {
    fakeSupabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: { message: 'Token has expired or is invalid' } })
    await openReset()
    await sendCode()
    await fillReset('000000', 'newpass1')
    expect(await screen.findByRole('alert')).toHaveTextContent('Token has expired or is invalid')
    expect(fakeSupabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('lets the user fix a rejected password without needing a new code', async () => {
    fakeSupabase.auth.updateUser
      .mockResolvedValueOnce({ data: {}, error: { message: 'Password should be at least 6 characters.' } })
      .mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null })
    await openReset()
    await sendCode()
    await fillReset('123456', 'abc')
    expect(await screen.findByRole('alert')).toHaveTextContent('Password should be at least 6 characters.')
    expect(screen.getByLabelText('Code from email')).toBeDisabled()

    await fillReset('123456', 'longenough')
    await waitFor(() => expect(onAuthSuccess).toHaveBeenCalledWith({ id: 'u1' }, { access_token: 't' }))
    // The code is single-use, so it must only have been checked once
    expect(fakeSupabase.auth.verifyOtp).toHaveBeenCalledOnce()
    expect(fakeSupabase.auth.verifyOtp).toHaveBeenCalledWith({ email: 'me@x.com', token: '123456', type: 'recovery' })
  })

  it('goes back to the login page', async () => {
    await openReset()
    await user.click(screen.getByRole('button', { name: 'Remembered it? Back to Log In' }))
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
  })
})

describe('Google sign-in', () => {
  it('opens Google in the browser and finishes with the returned code', async () => {
    renderAuth()
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await waitFor(() => expect(onAuthSuccess).toHaveBeenCalledWith({ id: 'google-user' }, { access_token: 't' }))
    expect(fakeSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://127.0.0.1:54500/auth/callback', skipBrowserRedirect: true }
    })
    expect(api.googleSignIn).toHaveBeenCalledWith('https://project.supabase.co/auth/v1/authorize?provider=google')
    expect(fakeSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('oauth-code')
  })

  it('shows a Cancel link while waiting for the browser', async () => {
    let finish
    api.googleSignIn.mockReturnValue(new Promise(resolve => { finish = resolve }))
    renderAuth()
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(api.cancelGoogleSignIn).toHaveBeenCalled()
    finish({ success: false, cancelled: true, error: 'Google sign-in was cancelled.' })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument() // cancelling isn't an error
    expect(onAuthSuccess).not.toHaveBeenCalled()
  })

  it('shows why sign-in failed', async () => {
    api.googleSignIn.mockResolvedValue({ success: false, error: 'Google sign-in timed out.' })
    renderAuth()
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Google sign-in timed out.')
  })

  it('is also offered on the sign-up page', async () => {
    renderAuth()
    await user.click(screen.getByRole('button', { name: 'Don\'t have an Account? Sign Up' }))
    await user.click(screen.getByRole('button', { name: 'Sign up with Google' }))
    await waitFor(() => expect(onAuthSuccess).toHaveBeenCalled())
  })
})
