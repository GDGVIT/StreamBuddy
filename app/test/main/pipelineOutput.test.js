// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createStageReader, parseStageLine } from '../../src/main/pipelineOutput'

describe('parseStageLine', () => {
  it.each([
    ['STAGE:TRANSCRIBING', { type: 'stage', stage: 'transcribing' }],
    ['STAGE:FINALIZING', { type: 'stage', stage: 'finalising' }],
    ['STAGE:DONE:C:\\Clips\\polished_Replay.mp4', { type: 'done', path: 'C:\\Clips\\polished_Replay.mp4' }],
    ['STAGE:ERROR:Couldn\'t build the vertical video.', { type: 'error', message: 'Couldn\'t build the vertical video.' }],
    ['STAGE:TRANSCRIBING\r', { type: 'stage', stage: 'transcribing' }], // Windows line ending
    ['DEBUG: srt content:', null],
    ['<font color="#ffff00">STAGE:</font>', null],
    ['', null]
  ])('%j', (line, expected) => {
    expect(parseStageLine(line)).toEqual(expected)
  })
})

describe('createStageReader', () => {
  function collect () {
    const events = []
    return { events, reader: createStageReader(e => events.push(e)) }
  }

  it('reports each stage in order and ignores debug output', () => {
    const { events, reader } = collect()
    reader.push('STAGE:TRANSCRIBING\nDEBUG: srt file size = 3871 bytes\nSTAGE:FINALIZING\nSTAGE:DONE:/clips/x.mp4\n')
    expect(events).toEqual([
      { type: 'stage', stage: 'transcribing' },
      { type: 'stage', stage: 'finalising' },
      { type: 'done', path: '/clips/x.mp4' }
    ])
  })

  it('handles a line split across two chunks of output', () => {
    const { events, reader } = collect()
    reader.push('STAGE:FINALIZING\nSTAGE:DO')
    expect(events).toEqual([{ type: 'stage', stage: 'finalising' }])
    reader.push('NE:C:\\Clips\\polished_x.mp4\r\n')
    expect(events.at(-1)).toEqual({ type: 'done', path: 'C:\\Clips\\polished_x.mp4' })
  })

  it('handles output arriving one character at a time', () => {
    const { events, reader } = collect()
    for (const ch of 'STAGE:TRANSCRIBING\nSTAGE:DONE:/a.mp4\n') reader.push(ch)
    expect(events.map(e => e.type)).toEqual(['stage', 'done'])
  })

  it('reads a final line that has no newline', () => {
    const { events, reader } = collect()
    reader.push('STAGE:DONE:/a.mp4')
    reader.end(0)
    expect(events).toEqual([{ type: 'done', path: '/a.mp4' }])
  })

  it('finishes only once', () => {
    const { events, reader } = collect()
    reader.push('STAGE:ERROR:first\nSTAGE:DONE:/a.mp4\n')
    reader.end(1)
    expect(events).toEqual([{ type: 'error', message: 'first' }])
  })

  it('reports a crash when Python exits without finishing', () => {
    const { events, reader } = collect()
    reader.push('STAGE:TRANSCRIBING\nTraceback (most recent call last):\n')
    reader.end(1)
    expect(events.at(-1)).toEqual({ type: 'error', message: 'The clip pipeline crashed (exit code 1).' })
  })

  it('reports a run that exits cleanly but never finished', () => {
    const { events, reader } = collect()
    reader.end(0)
    expect(events).toEqual([{ type: 'error', message: 'The clip pipeline stopped without finishing.' }])
  })

  it('stays quiet when the user cancelled the run', () => {
    const { events, reader } = collect()
    reader.push('STAGE:TRANSCRIBING\n')
    reader.cancel()
    reader.end(null) // killed
    expect(events).toEqual([{ type: 'stage', stage: 'transcribing' }])
  })
})
