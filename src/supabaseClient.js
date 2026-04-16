import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export function subscribeToAll(callback) {
  const channel = supabase
    .channel('tournament-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_settings' }, callback)
    .subscribe()

  return () => supabase.removeChannel(channel)
}
