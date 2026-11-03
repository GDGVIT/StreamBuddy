import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App, { displayName } from '../../src/App'
import { fakeSupabase } from '../helpers/fakeSupabase'
import { installElectronAPI } from '../helpers/fakeElectronAPI'

let api

beforeEach(() => {
  api = installElectronAPI()
})

function savedSession (metadata = {}) {
  const session = { access_token: 't', user: { id: 'alice', email: 'alice@x.com', user_metadata: metadata } }
  fakeSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null })
}

describe('app flow after a restart', () => {
  it('shows the login page with no saved session', async () => {
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Login' })).toBeInTheDocument()
  })

  it('goes straight to the dashboard for a returning user', async () => {
    savedSession({ username: 'Alice' })
    render(<App />)
    expect(await screen.findByRole('region', { name: 'Recent Clips' })).toBeInTheDocument()
    expect(api.getOnboardingStatus).toHaveBeenCalledWith('alice')
  })

  it('runs onboarding for an account that has not finished setup on this PC', async () => {
    savedSession({ username: 'Alice' })
    api.getOnboardingStatus.mockResolvedValue({ complete: false })
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Connect OBS Studio' })).toBeInTheDocument()
  })

  it('never asks for a name: email accounts without one go straight to the dashboard', async () => {
    savedSession({}) // signed up with email + password, no username yet
    render(<App />)
    expect(await screen.findByRole('region', { name: 'Recent Clips' })).toBeInTheDocument()
    expect(screen.queryByText('What should we call you?')).not.toBeInTheDocument()
  })
})

describe('displayName', () => {
  it.each([
    [{ email: 'parz@x.com', user_metadata: { username: 'Parz' } }, 'Parz'], // chosen in Settings
    [{ email: 'a@gmail.com', user_metadata: { full_name: 'Alice Google' } }, 'Alice Google'], // Google
    [{ email: 'a@x.com', user_metadata: { name: 'Al' } }, 'Al'],
    [{ email: 'streamer.one@x.com', user_metadata: {} }, 'streamer.one'], // email sign-up
    [null, '']
  ])('%j → %s', (user, expected) => {
    expect(displayName(user)).toBe(expected)
  })
})
