// pipeline.py reports progress on stdout with lines like
//   STAGE:TRANSCRIBING   STAGE:FINALIZING   STAGE:DONE:<path>   STAGE:ERROR:<message>
// mixed in with debug output. This turns that stream into events for the dashboard.

const STAGE_NAMES = { TRANSCRIBING: 'transcribing', FINALIZING: 'finalising' }

// One line of output → an event, or null for anything that isn't a STAGE line
export function parseStageLine (line) {
  const text = line.trim()
  if (!text.startsWith('STAGE:')) return null
  const body = text.slice('STAGE:'.length)
  if (body.startsWith('DONE:')) return { type: 'done', path: body.slice('DONE:'.length) }
  if (body.startsWith('ERROR:')) return { type: 'error', message: body.slice('ERROR:'.length) }
  return { type: 'stage', stage: STAGE_NAMES[body] || body.toLowerCase() }
}

// stdout arrives in arbitrary chunks, so one line can be split across two reads. The
// reader keeps the unfinished end of a chunk until the rest of the line arrives, and
// stops after the first DONE or ERROR so a run can only finish once.
export function createStageReader (onEvent) {
  let buffer = ''
  let finished = false

  function emit (event) {
    if (!event || finished) return
    if (event.type !== 'stage') finished = true
    onEvent(event)
  }

  return {
    push (chunk) {
      buffer += chunk
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop()
      lines.forEach(line => emit(parseStageLine(line)))
    },

    // The user cancelled the run: whatever the process does next isn't a failure
    cancel () {
      finished = true
    },

    // The process exited. If it never reported DONE or ERROR (it crashed, or Python
    // couldn't even start), that's reported as an error so the dashboard isn't stuck.
    end (exitCode) {
      if (buffer) emit(parseStageLine(buffer))
      buffer = ''
      if (finished) return
      emit({
        type: 'error',
        message: exitCode === 0
          ? 'The clip pipeline stopped without finishing.'
          : `The clip pipeline crashed (exit code ${exitCode}).`
      })
    }
  }
}
