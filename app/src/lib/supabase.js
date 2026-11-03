import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// PKCE: OAuth sign-in returns a one-time code that this client exchanges for a session
// (needed for Google sign-in, which finishes in the user's browser)
const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { flowType: 'pkce' }
})

export default supabase
