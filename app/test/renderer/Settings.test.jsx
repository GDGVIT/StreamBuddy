import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from '../../src/components/Settings'
import { fakeSupabase } from '../helpers/fakeSupabase'
import { installElectronAPI } from '../helpers/fakeElectronAPI'

let api, user, props

beforeEach(() => {
  api = installElectronAPI()
  user = userEvent.setup()
  props = { user: { id: 'alice', email: 'alice@x.com' }, username: 'Alice', onClose: vi.fn(), onSaved: vi.fn(), onUsernameChange: vi.fn(), onLogout: vi.fn() }
})

async function renderSettings (tab = 'account') {
  const result = render(<Settings {...props} initialTab={tab} />)
  await waitFor(() => expect(api.getClipDuration).toHaveBeenCalled())
  return result
}

const save = () => user.click(screen.getByRole('button', { name: /Save/ }))

describe('settings dialog', () => {
  it('pauses the clip hotkey while open and turns it back on when closed', async () => {
    const { unmount } = await renderSettings()
    expect(api.setAppReady).toHaveBeenCalledWith(false)
    unmount()
    expect(api.setAppReady).toHaveBeenLastCalledWith(true)
  })

  it('Escape closes the dialog', async () => {
    await renderSettings()
    await user.keyboard('{Escape}')
    expect(props.onClose).toHaveBeenCalled()
  })

  it('only saves what changed', async () => {
    await renderSettings('hotkey')
    await user.click(screen.getByRole('button', { name: 'Set Key →' }))
    await user.keyboard('{F9}')
    await save()
    await waitFor(() => expect(props.onClose).toHaveBeenCalled())
    expect(api.setHotkey).toHaveBeenCalledWith('F9')
    expect(api.setOutputFolder).not.toHaveBeenCalled()
    expect(api.setClipDuration).not.toHaveBeenCalled()
    expect(fakeSupabase.auth.updateUser).not.toHaveBeenCalled()
    expect(props.onSaved).toHaveBeenCalledWith({ hotkey: 'F9' })
  })

  it('Escape while picking a key cancels the pick instead of closing', async () => {
    await renderSettings('hotkey')
    await user.click(screen.getByRole('button', { name: 'Set Key →' }))
    await user.keyboard('{Escape}')
    expect(props.onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Current Hotkey: F5')).toBeInTheDocument()
  })

  it('stays open and explains a hotkey that is taken', async () => {
    api.setHotkey.mockResolvedValue({ success: false, error: 'failed' })
    await renderSettings('hotkey')
    await user.click(screen.getByRole('button', { name: 'Set Key →' }))
    await user.keyboard('{F12}')
    await save()
    expect(await screen.findByRole('alert')).toHaveTextContent('"F12" can\'t be used as a shortcut')
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('updates the username in Supabase', async () => {
    await renderSettings('account')
    const input = screen.getByLabelText('Username')
    await user.clear(input)
    await user.type(input, 'NewName')
    await save()
    await waitFor(() => expect(fakeSupabase.auth.updateUser).toHaveBeenCalledWith({ data: { username: 'NewName' } }))
    expect(screen.getByLabelText('E-mail')).toHaveValue('alice@x.com')
    expect(props.onUsernameChange).toHaveBeenCalledWith('NewName')
  })

  it('changes the clip duration', async () => {
    await renderSettings('duration')
    const radios = screen.getAllByRole('radio')
    const other = radios.find(r => r.getAttribute('aria-checked') === 'false')
    await user.click(other)
    await save()
    await waitFor(() => expect(api.setClipDuration).toHaveBeenCalled())
    expect(api.setClipDuration.mock.calls[0][0]).not.toBe(60)
  })

})

describe('log out', () => {
  it('asks before logging out', async () => {
    await renderSettings('account')
    await user.click(screen.getByRole('button', { name: 'Log Out' }))
    const dialog = screen.getByRole('dialog', { name: 'Log out' })
    await user.click(within(dialog).getByRole('button', { name: 'Log Out' }))
    expect(props.onLogout).toHaveBeenCalled()
  })

  it('Cancel keeps the user logged in', async () => {
    await renderSettings('account')
    await user.click(screen.getByRole('button', { name: 'Log Out' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Log out' })).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'Log out' })).not.toBeInTheDocument()
    expect(props.onLogout).not.toHaveBeenCalled()
  })

  it('Escape closes the confirmation but leaves Settings open', async () => {
    await renderSettings('account')
    await user.click(screen.getByRole('button', { name: 'Log Out' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Log out' })).not.toBeInTheDocument()
    expect(props.onClose).not.toHaveBeenCalled()
  })
})

describe('delete account', () => {
  async function openDelete () {
    await renderSettings('account')
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    return screen.getByRole('dialog', { name: 'Delete account' })
  }

  it('warns what will happen and names the account', async () => {
    const dialog = await openDelete()
    expect(within(dialog).getByText('alice@x.com')).toBeInTheDocument()
    expect(within(dialog).getByText('This can\'t be undone.')).toBeInTheDocument()
  })

  it('only allows deleting after typing DELETE', async () => {
    const dialog = await openDelete()
    const confirm = within(dialog).getByRole('button', { name: 'Delete Account' })
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByLabelText('Type DELETE to confirm'), 'delet')
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByLabelText('Type DELETE to confirm'), 'e')
    expect(confirm).toBeEnabled() // not case-sensitive
  })

  it('deletes the account and logs out', async () => {
    fakeSupabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token-123' } }, error: null })
    const dialog = await openDelete()
    await user.type(within(dialog).getByLabelText('Type DELETE to confirm'), 'DELETE')
    await user.click(within(dialog).getByRole('button', { name: 'Delete Account' }))
    await waitFor(() => expect(props.onLogout).toHaveBeenCalled())
    expect(api.deleteAccount).toHaveBeenCalledWith('token-123')
  })

  it('stays open and explains a failure', async () => {
    fakeSupabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })
    api.deleteAccount.mockResolvedValue({ success: false, error: 'Network error' })
    const dialog = await openDelete()
    await user.type(within(dialog).getByLabelText('Type DELETE to confirm'), 'DELETE')
    await user.click(within(dialog).getByRole('button', { name: 'Delete Account' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Couldn\'t delete your account: Network error')
    expect(props.onLogout).not.toHaveBeenCalled()
  })

  it('Keep My Account backs out', async () => {
    const dialog = await openDelete()
    await user.click(within(dialog).getByRole('button', { name: 'Keep My Account' }))
    expect(screen.queryByRole('dialog', { name: 'Delete account' })).not.toBeInTheDocument()
    expect(api.deleteAccount).not.toHaveBeenCalled()
  })
})
