import { createClient } from '@supabase/supabase-js'

// Vous devrez remplacer ces valeurs par celles de votre projet Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://erowwdiqlooseyvenesd.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyb3d3ZGlxbG9vc2V5dmVuZXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDAzMjEsImV4cCI6MjA5NDI3NjMyMX0.338eEhJ_sTlZ99VqZ7HZ15eUy5DahA6lnSdBX15BTrc'

export const supabase = createClient(supabaseUrl, supabaseKey)
