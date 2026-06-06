import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl) {
	// Do not log sensitive keys
	console.error('Missing VITE_SUPABASE_URL. Check your .env file or environment variables')
}
if (!supabaseKey) {
	console.error('Missing VITE_SUPABASE_ANON_KEY. Check your .env file or environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)