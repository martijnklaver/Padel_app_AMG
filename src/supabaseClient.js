import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export function subscribeToSession(sessionId, callback) {
  const channel = supabase
    .channel('session-' + sessionId)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'matches',
      filter: `session_id=eq.${sessionId}`,
    }, callback)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'schedule',
      filter: `session_id=eq.${sessionId}`,
    }, callback)
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export function subscribeToSessions(callback) {
  const channel = supabase
    .channel('sessions-watch')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, callback)
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export async function uploadPlayerAvatar(playerId, file) {
  const path = `${playerId}.jpg`
  console.log('[avatar] uploading', path, 'type:', file.type, 'size:', file.size)

  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadErr) {
    console.error('[avatar] storage error:', uploadErr)
    return { error: uploadErr.message || 'Upload mislukt', url: null }
  }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${publicUrl}?t=${Date.now()}`
  console.log('[avatar] public url:', url)

  const { error: dbErr } = await supabase.from('players').update({ avatar_url: url }).eq('id', playerId)
  if (dbErr) {
    console.error('[avatar] db error:', dbErr)
    return { error: dbErr.message || 'Opslaan mislukt', url: null }
  }

  return { error: null, url }
}

export async function saveMatchPoppers(matchId, sessionId, matchRow, counts) {
  await supabase.from('poppers').delete().eq('match_id', matchId)
  const team1 = [matchRow.team1_p1, matchRow.team1_p2]
  const team2 = [matchRow.team2_p1, matchRow.team2_p2]
  const rows = [...team1, ...team2]
    .filter(id => (counts[id] || 0) > 0)
    .map(id => ({
      match_id: matchId,
      session_id: sessionId,
      player_id: id,
      opponent_ids: team1.includes(id) ? team2 : team1,
      count: counts[id],
    }))
  if (rows.length > 0) {
    await supabase.from('poppers').insert(rows)
  }
}
