import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExportModal from '../../src/components/dashboard/ExportModal'
import { installElectronAPI, makeClip } from '../helpers/fakeElectronAPI'

let api, user, onExported

beforeEach(() => {
  api = installElectronAPI()
  user = userEvent.setup()
  onExported = vi.fn()
})

function renderExport (clips) {
  return render(<ExportModal clips={clips} durations={{}} onClose={vi.fn()} onExported={onExported} />)
}

const exportButton = () => screen.getByRole('button', { name: /Export Selected/ })

describe('export dialog', () => {
  it('shows the chosen destination', async () => {
    renderExport([makeClip('polished_a.mp4')])
    await user.click(screen.getByRole('button', { name: 'Choose folder…' }))
    expect(screen.getByRole('button', { name: 'D:\\Exports' })).toBeInTheDocument()
  })

  it('needs a destination first', async () => {
    renderExport([makeClip('polished_a.mp4')])
    await user.click(exportButton())
    expect(screen.getByText('Choose a destination folder first.')).toBeInTheDocument()
    expect(api.exportClip).not.toHaveBeenCalled()
  })

  it('exports one clip under the name typed in', async () => {
    const clip = makeClip('polished_a.mp4')
    renderExport([clip])
    expect(screen.getByLabelText('File Name')).toHaveValue('polished_a')
    await user.clear(screen.getByLabelText('File Name'))
    await user.type(screen.getByLabelText('File Name'), 'Best play ')
    await user.click(screen.getByRole('button', { name: 'Choose folder…' }))
    await user.click(exportButton())
    await waitFor(() => expect(onExported).toHaveBeenCalled())
    expect(api.exportClip).toHaveBeenCalledWith(clip.path, 'D:\\Exports', 'Best play')
  })

  it('exports several clips with their own names', async () => {
    const clips = [makeClip('a.mp4'), makeClip('b.mp4')]
    renderExport(clips)
    expect(screen.queryByLabelText('File Name')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Choose folder…' }))
    await user.click(exportButton())
    await waitFor(() => expect(onExported).toHaveBeenCalled())
    expect(api.exportClip).toHaveBeenNthCalledWith(1, clips[0].path, 'D:\\Exports', undefined)
    expect(api.exportClip).toHaveBeenNthCalledWith(2, clips[1].path, 'D:\\Exports', undefined)
  })

  it('stops and explains when a file with that name already exists', async () => {
    api.exportClip.mockResolvedValue({ success: false, error: 'A file with that name already exists in that folder.' })
    renderExport([makeClip('polished_a.mp4')])
    await user.click(screen.getByRole('button', { name: 'Choose folder…' }))
    await user.click(exportButton())
    expect(await screen.findByText('A file with that name already exists in that folder.')).toBeInTheDocument()
    expect(onExported).not.toHaveBeenCalled()
  })
})
