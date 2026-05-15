import { createClient } from '@supabase/supabase-js'

// Vous devrez remplacer ces valeurs par celles de votre projet Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://VOTRE_ID.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'VOTRE_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)
