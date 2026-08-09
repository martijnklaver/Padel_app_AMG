import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Start de download van alle profielfoto's zodra spelers geladen zijn, zodat
// de browser ze al in cache heeft tegen de tijd dat een pagina ze toont.
export function preloadAvatars(players) {
  players.forEach((p) => {
    if (!p.avatar_url) return
    const img = new Image()
    img.src = p.avatar_url
  })
}

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

  const arrayBuffer = await file.arrayBuffer()
  console.log('[avatar] stap 2: arrayBuffer bytes:', arrayBuffer.byteLength)

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { upsert: true, contentType: file.type, cacheControl: '31536000' })
  console.log('[avatar] stap 3: upload result:', uploadData, 'error:', uploadErr)

  if (uploadErr) {
    return { error: uploadErr.message || 'Upload mislukt', url: null }
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
  const plainUrl = urlData.publicUrl
  console.log('[avatar] stap 4: public url:', plainUrl)

  // DB bewaart de schone URL (geen cache-bust) zodat de browser 'm langdurig kan cachen.
  const { data: updateData, error: dbErr } = await supabase
    .from('players')
    .update({ avatar_url: plainUrl })
    .eq('id', playerId)
    .select()
  console.log('[avatar] stap 5: db update result:', updateData, 'error:', dbErr)

  if (dbErr) {
    return { error: dbErr.message || 'Opslaan mislukt', url: null }
  }

  // Alleen direct na upload cache-busten, zodat de net geüploade foto meteen zichtbaar is
  // (zelfde storage-pad kan al gecached zijn met de oude foto).
  return { error: null, url: `${plainUrl}?t=${Date.now()}` }
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
