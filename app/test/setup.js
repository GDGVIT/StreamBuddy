import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { resetFakeSupabase } from './helpers/fakeSupabase'

// Every component imports this client; the real one needs .env values and a network
vi.mock('../src/lib/supabase', async () => {
  const { fakeSupabase } = await import('./helpers/fakeSupabase')
  return { default: fakeSupabase }
})

beforeEach(() => {
  resetFakeSupabase()
})

afterEach(() => {
  cleanup()
  delete globalThis.window?.electronAPI
})
