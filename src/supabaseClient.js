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
  console.log('[avatar] stap 1: start upload', path, file)

  // Zorg dat de bucket bestaat
  const { error: bucketErr } = await supabase.storage.createBucket('avatars', { public: true })
  if (bucketErr && !bucketErr.message?.includes('already exists') && !bucketErr.message?.includes('The resource already exists')) {
    console.warn('[avatar] bucket aanmaken:', bucketErr.message)
  } else {
    console.log('[avatar] stap 2: bucket ok')
  }

  const arrayBuffer = await file.arrayBuffer()
  console.log('[avatar] stap 3: arrayBuffer bytes:', arrayBuffer.byteLength)

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { upsert: true, contentType: file.type })
  console.log('[avatar] stap 4: upload result:', uploadData, 'error:', uploadErr)

  if (uploadErr) {
    return { error: uploadErr.message || 'Upload mislukt', url: null }
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${urlData.publicUrl}?t=${Date.now()}`
  console.log('[avatar] stap 5: public url:', url)

  const { data: updateData, error: dbErr } = await supabase
    .from('players')
    .update({ avatar_url: url })
    .eq('id', playerId)
    .select()
  console.log('[avatar] stap 6: db update result:', updateData, 'error:', dbErr)

  if (dbErr) {
    return { error: dbErr.message || 'Opslaan mislukt', url: null }
  }

  return { error: null, url }
}

export async function saveMatchPoppers(matchId, sessionId, matchRow, counts) {
  const { error: delErr } = await supabase.from('poppers').delete().eq('match_id', matchId)
  if (delErr) console.error('[poppers] delete error:', delErr)

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
    const { error: insErr } = await supabase.from('poppers').insert(rows)
    if (insErr) console.error('[poppers] insert error:', insErr)
  }
}
