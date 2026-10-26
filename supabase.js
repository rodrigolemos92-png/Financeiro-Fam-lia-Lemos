import { createClient } from '@supabase/supabase-js'

// A chave "anon" é PÚBLICA por desenho: quem protege os dados são as regras (RLS) do banco.
// Pode ser sobrescrita por variáveis de ambiente (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://pxwfrjpbeoqsypaugatl.supabase.co'
const ANON =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d2ZyanBiZW9xc3lwYXVnYXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMzUzMzgsImV4cCI6MjEwODYxMTMzOH0.JfOByMhm_HttrCWScot3q8cPwaBaT0d4hkWlWn73qX0'

export const supabase = createClient(URL, ANON, {
  auth: { persistSession: true, autoRefreshToken: true },
})
