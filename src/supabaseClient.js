import { createClient } from '@supabase/supabase-js'
import { computeAchievementEvents, ACHIEVEMENTS } from './utils/achievements'

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

// Speelt de volledige historie af, vergelijkt met wat al is opgeslagen, en
// voegt alleen de nieuw-behaalde achievements toe. Retourneert de nieuw
// toegevoegde badges (met speler/label/icon erbij) t.b.v. toast + eindscherm.
export async function syncAchievements(players) {
  const [{ data: sessions }, { data: matches }, { data: poppers }, { data: existing }] = await Promise.all([
    supabase.from('sessions').select('*'),
    supabase.from('matches').select('*').eq('is_completed', true),
    supabase.from('poppers').select('*'),
    supabase.from('achievements').select('player_id, achievement_key'),
  ])

  const events = computeAchievementEvents(players, sessions ?? [], matches ?? [], poppers ?? [])

  const existingKeys = new Set((existing ?? []).map((a) => `${a.player_id}|${a.achievement_key}`))
  const newEvents = events.filter((e) => !existingKeys.has(`${e.player_id}|${e.achievement_key}`))
  if (newEvents.length === 0) return []

  const { data: inserted, error } = await supabase
    .from('achievements')
    .upsert(
      newEvents.map((e) => ({ player_id: e.player_id, achievement_key: e.achievement_key, achieved_at: e.achieved_at })),
      { onConflict: 'player_id,achievement_key', ignoreDuplicates: true }
    )
    .select()

  if (error) {
    console.error('[achievements] insert error:', error)
    return []
  }

  return (inserted ?? []).map((row) => {
    const player = players.find((p) => p.id === row.player_id)
    const meta = ACHIEVEMENTS[row.achievement_key]
    return { ...row, playerName: player?.name ?? '?', icon: meta?.icon ?? '🏅', label: meta?.label ?? row.achievement_key }
  })
}

export async function uploadSessionPhoto(sessionId, file) {
  const path = `${sessionId}.jpg`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadErr } = await supabase.storage
    .from('session-photos')
    .upload(path, arrayBuffer, { upsert: true, contentType: file.type, cacheControl: '31536000' })

  if (uploadErr) {
    return { error: uploadErr.message || 'Upload mislukt', url: null }
  }

  const { data: urlData } = supabase.storage.from('session-photos').getPublicUrl(path)
  const plainUrl = urlData.publicUrl

  const { error: dbErr } = await supabase
    .from('sessions')
    .update({ photo_url: plainUrl })
    .eq('id', sessionId)

  if (dbErr) {
    return { error: dbErr.message || 'Opslaan mislukt', url: null }
  }

  // Cache-bust zodat de net geüploade foto meteen zichtbaar is als hetzelfde pad al gecached was.
  return { error: null, url: `${plainUrl}?t=${Date.now()}` }
}

export async function removeSessionPhoto(sessionId) {
  const { error } = await supabase.from('sessions').update({ photo_url: null }).eq('id', sessionId)
  return { error: error?.message ?? null }
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
