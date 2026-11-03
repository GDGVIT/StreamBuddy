import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Onboarding from '../../src/components/Onboarding'
import { installElectronAPI } from '../helpers/fakeElectronAPI'

let api, user, onComplete

beforeEach(() => {
  api = installElectronAPI()
  user = userEvent.setup()
  onComplete = vi.fn()
})

function renderOnboarding () {
  return render(<Onboarding user={{ id: 'alice' }} onComplete={onComplete} />)
}

// The OBS step pauses ~1s before connecting, for feel
const SLOW = { timeout: 3000 }

async function goToHotkeyStep () {
  renderOnboarding()
  await user.click(await screen.findByRole('button', { name: 'Next →' }, SLOW))
  await screen.findByText('Current Hotkey')
}

describe('OBS step', () => {
  it('connects automatically and moves on', async () => {
    renderOnboarding()
    expect(await screen.findByText('OBS Connected', {}, SLOW)).toBeInTheDocument()
    expect(api.connectOBS).toHaveBeenCalledOnce()
  })

  it('explains a failed connection in plain language, with the raw error under Technical details', async () => {
    api.connectOBS.mockResolvedValue({ success: false, code: 'ECONNREFUSED', error: 'connect ECONNREFUSED 127.0.0.1:4455' })
    renderOnboarding()
    expect(await screen.findByText('Couldn\'t connect to OBS', {}, SLOW)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'More Info' }))
    expect(screen.getByText('StreamBuddy can’t reach OBS')).toBeInTheDocument()
    expect(screen.getByText(/tick “Enable WebSocket server”/)).toBeInTheDocument()
    expect(screen.getByText('ECONNREFUSED – connect ECONNREFUSED 127.0.0.1:4455')).toBeInTheDocument()
  })

  it('gives password advice when OBS has authentication on', async () => {
    api.connectOBS.mockResolvedValue({ success: false, code: 4009, error: 'Authentication failed.' })
    renderOnboarding()
    await screen.findByText('Couldn\'t connect to OBS', {}, SLOW)
    await user.click(screen.getByRole('button', { name: 'More Info' }))
    expect(screen.getByText('OBS is asking for a password')).toBeInTheDocument()
  })

  it('Retry tries again', async () => {
    api.connectOBS.mockResolvedValueOnce({ success: false, error: 'connect ECONNREFUSED' })
    renderOnboarding()
    await user.click(await screen.findByRole('button', { name: /Retry/ }, SLOW))
    expect(await screen.findByText('OBS Connected', {}, SLOW)).toBeInTheDocument()
    expect(api.connectOBS).toHaveBeenCalledTimes(2)
  })
})

describe('hotkey step', () => {
  it('offers to keep the current key', async () => {
    await goToHotkeyStep()
    expect(screen.getByRole('button', { name: 'Keep F5 →' })).toBeInTheDocument()
  })

  it('uses whatever key the user presses', async () => {
    await goToHotkeyStep()
    await user.keyboard('{F8}')
    await waitFor(() => expect(api.setHotkey).toHaveBeenCalledWith('F8'))
    expect(screen.getByText('F8', { selector: 'kbd' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next →' })).toBeInTheDocument()
  })

  it('turns letters into uppercase and space into "Space"', async () => {
    await goToHotkeyStep()
    await user.keyboard('k')
    await waitFor(() => expect(api.setHotkey).toHaveBeenLastCalledWith('K'))
    await user.keyboard(' ')
    await waitFor(() => expect(api.setHotkey).toHaveBeenLastCalledWith('Space'))
  })

  it('ignores modifier keys on their own and Tab', async () => {
    await goToHotkeyStep()
    await user.keyboard('{Shift}{Control}{Tab}')
    expect(api.setHotkey).not.toHaveBeenCalled()
  })

  it('explains a key that another app has taken', async () => {
    api.setHotkey.mockResolvedValue({ success: false, error: 'globalShortcut.register("F12") failed' })
    await goToHotkeyStep()
    await user.keyboard('{F12}')
    expect(await screen.findByText('Couldn\'t set that hotkey')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'More Info' }))
    expect(screen.getByText('That key is already taken')).toBeInTheDocument()
  })
})

describe('folder step', () => {
  it('saves the folder and finishes onboarding for this account', async () => {
    await goToHotkeyStep()
    await user.click(screen.getByRole('button', { name: 'Keep F5 →' }))
    await user.click(await screen.findByRole('button', { name: 'Select Output Folder →' }))
    const modal = await screen.findByRole('dialog', { name: /Selected Directory/ })
    expect(within(modal).getByText(/Clips/)).toBeInTheDocument()
    await user.click(within(modal).getByRole('button', { name: 'Continue →' }))
    await waitFor(() => expect(onComplete).toHaveBeenCalled())
    expect(api.completeOnboarding).toHaveBeenCalledWith('alice')
  })

  it('shows an error if the setup could not be saved', async () => {
    api.completeOnboarding.mockRejectedValue(new Error('EPERM: operation not permitted'))
    await goToHotkeyStep()
    await user.click(screen.getByRole('button', { name: 'Keep F5 →' }))
    await user.click(await screen.findByRole('button', { name: 'Select Output Folder →' }))
    await user.click(await screen.findByRole('button', { name: 'Continue →' }))
    expect(await screen.findByText('Couldn’t save your setup.')).toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()
  })
})
