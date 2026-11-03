import { vi } from 'vitest'

// Stand-in for the Supabase client. Each test overrides only the calls it cares about,
// e.g. fakeSupabase.auth.signInWithPassword.mockResolvedValue({ ... })
export const fakeSupabase = { auth: {} }

export function resetFakeSupabase () {
  fakeSupabase.auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } }),
    // A new account that still needs its email confirmed
    signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'new', identities: [{ provider: 'email' }] }, session: null }, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://project.supabase.co/auth/v1/authorize?provider=google' }, error: null }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { user: { id: 'google-user' }, session: { access_token: 't' } }, error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ data: { session: { access_token: 't' } }, error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    resend: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null })
  }
}
