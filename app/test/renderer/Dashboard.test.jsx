import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Dashboard from '../../src/components/Dashboard'
import { installElectronAPI, makeClip } from '../helpers/fakeElectronAPI'

const ALICE = { id: 'alice', email: 'alice@x.com', user_metadata: { username: 'Alice' } }
const CLIPS = [
  makeClip('polished_boss_fight.mp4', { minutesAgo: 2 }),
  makeClip('polished_clutch.mp4', { minutesAgo: 30 }),
  makeClip('polished_funny_fail.mp4', { minutesAgo: 60 * 24 * 3 })
]

let api, user

beforeEach(() => {
  api = installElectronAPI({ listClips: vi.fn().mockResolvedValue(CLIPS) })
  user = userEvent.setup()
})

function renderDashboard (props = {}) {
  return render(<Dashboard user={ALICE} username="Alice" currentStage={null} onLogout={vi.fn()} onUsernameChange={vi.fn()} {...props} />)
}

const clipButton = (name) => screen.getByTitle(name)

describe('loading clips', () => {
  it("tells the main process who's logged in before listing their clips", async () => {
    renderDashboard()
    expect(await screen.findByTitle('polished_clutch.mp4')).toBeInTheDocument()
    expect(api.setCurrentUser).toHaveBeenCalledWith('alice')
    expect(api.setCurrentUser.mock.invocationCallOrder[0]).toBeLessThan(api.listClips.mock.invocationCallOrder[0])
  })

  it('clears the logged-in account when the dashboard closes (logout)', async () => {
    const { unmount } = renderDashboard()
    await screen.findByTitle('polished_clutch.mp4')
    unmount()
    expect(api.setCurrentUser).toHaveBeenLastCalledWith(null)
  })

  it('shows quick stats for today and this week', async () => {
    renderDashboard()
    const stats = await screen.findByRole('region', { name: 'Quick Stats' })
    await waitFor(() => expect(within(stats).getByText('Today:').nextSibling).toHaveTextContent('2'))
    expect(within(stats).getByText('This Week:').nextSibling).toHaveTextContent('3')
  })

  it('explains what to do when there are no clips yet', async () => {
    api.listClips.mockResolvedValue([])
    renderDashboard()
    expect(await screen.findByText(/No clips yet — press F5 while streaming/)).toBeInTheDocument()
  })

  it('lists a clip that just finished even if the folder listing lags behind', async () => {
    api.listClips.mockResolvedValue([])
    const { rerender } = renderDashboard()
    await screen.findByText(/No clips yet/)
    const path = 'C:\\Clips\\polished_new.mp4'
    rerender(<Dashboard user={ALICE} username="Alice" currentStage={{ status: 'completed', path }} onLogout={vi.fn()} onUsernameChange={vi.fn()} />)
    expect(await screen.findByTitle('polished_new.mp4')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Clip ready' })).toBeInTheDocument()
  })
})

describe('search', () => {
  it('filters clips by name', async () => {
    renderDashboard()
    await screen.findByTitle('polished_clutch.mp4')
    await user.type(screen.getByLabelText('Search clips'), 'CLUTCH')
    expect(screen.getByTitle('polished_clutch.mp4')).toBeInTheDocument()
    expect(screen.queryByTitle('polished_boss_fight.mp4')).not.toBeInTheDocument()
  })

  it('says when nothing matches', async () => {
    renderDashboard()
    await screen.findByTitle('polished_clutch.mp4')
    await user.type(screen.getByLabelText('Search clips'), 'zzz')
    expect(screen.getByText('No clips match “zzz”.')).toBeInTheDocument()
  })
})

describe('selecting clips', () => {
  async function selectTwo () {
    renderDashboard()
    await screen.findByTitle('polished_clutch.mp4')
    await user.keyboard('{Control>}')
    await user.click(clipButton('polished_clutch.mp4'))
    await user.keyboard('{/Control}')
    await user.click(clipButton('polished_boss_fight.mp4')) // in selection mode a plain click selects too
  }

  it('Ctrl+click starts selecting and shows Delete / Export', async () => {
    await selectTwo()
    expect(clipButton('polished_clutch.mp4')).toHaveAttribute('aria-pressed', 'true')
    expect(clipButton('polished_boss_fight.mp4')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Export Selection' })).toBeInTheDocument()
  })

  it('a plain click plays the clip when nothing is selected', async () => {
    renderDashboard()
    await user.click(await screen.findByTitle('polished_clutch.mp4'))
    expect(screen.getByRole('dialog', { name: 'Playing polished_clutch.mp4' })).toBeInTheDocument()
  })

  it('clicking a selected clip again unselects it', async () => {
    await selectTwo()
    await user.click(clipButton('polished_clutch.mp4'))
    expect(clipButton('polished_clutch.mp4')).toHaveAttribute('aria-pressed', 'false')
  })

  it('Escape clears the selection', async () => {
    await selectTwo()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: 'Export Selection' })).not.toBeInTheDocument()
  })

  it('clicking empty space inside the window clears the selection', async () => {
    await selectTwo()
    await user.click(screen.getByRole('region', { name: 'Quick Stats' }))
    expect(screen.queryByRole('button', { name: 'Export Selection' })).not.toBeInTheDocument()
  })

  it('clicking the purple page around the window clears the selection too', async () => {
    await selectTwo()
    const page = document.querySelector('[data-stage]').parentElement
    await user.click(page)
    expect(screen.queryByRole('button', { name: 'Export Selection' })).not.toBeInTheDocument()
  })

  it('typing in the search box keeps the selection', async () => {
    await selectTwo()
    await user.click(screen.getByLabelText('Search clips'))
    expect(screen.getByRole('button', { name: 'Export Selection' })).toBeInTheDocument()
  })

  it('deletes the selected clips after confirming', async () => {
    await selectTwo()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirm = screen.getByRole('dialog', { name: 'Delete clips' })
    expect(within(confirm).getByText('Delete 2 clips?')).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(api.deleteClips).toHaveBeenCalledWith(expect.arrayContaining([CLIPS[0].path, CLIPS[1].path])))
    expect(api.deleteClips.mock.calls[0][0]).toHaveLength(2)
  })

  it('opens the export dialog with the selected clips', async () => {
    await selectTwo()
    await user.click(screen.getByRole('button', { name: 'Export Selection' }))
    expect(screen.getByRole('dialog', { name: 'Export clips' })).toBeInTheDocument()
  })
})

describe('clip pipeline status', () => {
  it('shows progress while a clip is being made', async () => {
    renderDashboard({ currentStage: 'transcribing' })
    expect(await screen.findByText('Transcribing… hang tight, your clip is on its way.')).toBeInTheDocument()
  })

  it('shows a pipeline failure in Standing By — not as an OBS problem', async () => {
    renderDashboard()
    await screen.findByTitle('polished_clutch.mp4')
    act(() => api.emit('pipeline-error', 'Couldn\'t transcribe the clip\'s audio.'))
    expect(screen.getByRole('alert')).toHaveTextContent('That clip didn\'t work: Couldn\'t transcribe the clip\'s audio. Press F5 to try again.')
    expect(screen.queryByRole('alertdialog', { name: /OBS Disconnected/ })).not.toBeInTheDocument()
  })

  it('clears the failure message when the next clip starts', async () => {
    const { rerender } = renderDashboard()
    await screen.findByTitle('polished_clutch.mp4')
    act(() => api.emit('pipeline-error', 'The clip pipeline crashed (exit code 1).'))
    rerender(<Dashboard user={ALICE} username="Alice" currentStage="clipping" onLogout={vi.fn()} onUsernameChange={vi.fn()} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the OBS Disconnected screen when OBS drops', async () => {
    renderDashboard()
    await screen.findByTitle('polished_clutch.mp4')
    act(() => api.emit('obs-error', 'OBS is not connected.'))
    expect(screen.getByRole('alertdialog', { name: /OBS Disconnected/ })).toBeInTheDocument()
  })

  it('asks for a new folder when the output folder has gone missing', async () => {
    renderDashboard()
    await screen.findByTitle('polished_clutch.mp4')
    act(() => api.emit('output-folder-missing'))
    expect(await screen.findByText(/Can.t Find/)).toBeInTheDocument()
  })
})
