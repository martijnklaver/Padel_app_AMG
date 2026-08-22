import { createClient } from '@supabase/supabase-js'
import { computeAchievementEvents, summarizeAchievements, ACHIEVEMENTS } from './utils/achievements'

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

// Speelt de volledige historie af en vergelijkt de berekende events met wat al
// is opgeslagen. Elke keer dat een badge behaald wordt (ook stapelbare, zoals
// Sessiewinnaar) is een aparte rij met de bijbehorende session_id — een
// (speler, badge, sessie) combinatie kan dus maar één keer voorkomen, wat als
// dedupe-sleutel dient bij het incrementeel wegschrijven. Retourneert alleen
// de nieuw-behaalde badges (met speler/label/icon erbij) t.b.v. toast + eindscherm.
export async function syncAchievements(players) {
  const [{ data: sessions }, { data: matches }, { data: poppers }, { data: existing }] = await Promise.all([
    supabase.from('sessions').select('*'),
    supabase.from('matches').select('*').eq('is_completed', true),
    supabase.from('poppers').select('*'),
    supabase.from('achievements').select('player_id, achievement_key, session_id'),
  ])

  const events = computeAchievementEvents(players, sessions ?? [], matches ?? [], poppers ?? [])

  const existingKeys = new Set(
    (existing ?? []).map((r) => `${r.player_id}|${r.achievement_key}|${r.session_id}`)
  )
  const newEvents = events.filter(
    (e) => !existingKeys.has(`${e.player_id}|${e.achievement_key}|${e.session_id}`)
  )

  if (newEvents.length === 0) return []

  const { error } = await supabase.from('achievements').insert(
    newEvents.map((e) => ({
      player_id: e.player_id,
      achievement_key: e.achievement_key,
      session_id: e.session_id,
      achieved_at: e.achieved_at,
    }))
  )

  if (error) {
    console.error('[achievements] insert error:', error)
    return []
  }

  return newEvents.map((e) => {
    const player = players.find((p) => p.id === e.player_id)
    const meta = ACHIEVEMENTS[e.achievement_key]
    return {
      ...e,
      playerName: player?.name ?? '?',
      icon: meta?.icon ?? '🏅',
      label: meta?.label ?? e.achievement_key,
      description: meta?.description ?? '',
    }
  })
}

// Herberekent alle achievements met terugwerkende kracht: wist de volledige
// achievements-tabel en bouwt 'm opnieuw op door de complete sessiegeschiedenis
// (oudste eerst) chronologisch af te spelen. Elk event (ook herhaalde
// stapelbare badges) wordt als aparte rij met session_id opgeslagen. Nuttig na
// wijzigingen aan de achievement-regels of na het verwijderen van een sessie,
// om te garanderen dat de opgeslagen rijen exact overeenkomen met wat de
// huidige logica zou berekenen — in tegenstelling tot syncAchievements(), dat
// alleen incrementeel bijwerkt.
export async function runHistoricalAchievements() {
  const [{ data: players }, { data: sessions }, { data: matches }, { data: poppers }] = await Promise.all([
    supabase.from('players').select('*'),
    supabase.from('sessions').select('*').eq('is_completed', true).order('date', { ascending: true }),
    supabase.from('matches').select('*').eq('is_completed', true),
    supabase.from('poppers').select('*'),
  ])

  const { error: delError } = await supabase.from('achievements').delete().not('id', 'is', null)
  if (delError) {
    console.error('[achievements] delete error:', delError)
    throw delError
  }

  const events = computeAchievementEvents(players ?? [], sessions ?? [], matches ?? [], poppers ?? [])

  const rows = events.map((e) => ({
    player_id: e.player_id,
    achievement_key: e.achievement_key,
    session_id: e.session_id,
    achieved_at: e.achieved_at,
  }))

  if (rows.length > 0) {
    const { error: insError } = await supabase.from('achievements').insert(rows)
    if (insError) {
      console.error('[achievements] insert error:', insError)
      throw insError
    }
  }

  const summary = summarizeAchievements(events)
  const perPlayer = new Map()
  summary.forEach((s) => {
    perPlayer.set(s.player_id, (perPlayer.get(s.player_id) ?? 0) + 1)
  })
  console.log(`[achievements] ${rows.length} achievement-rijen opgeslagen (${events.length} events verwerkt over ${(sessions ?? []).length} sessies).`)
  ;(players ?? []).forEach((p) => {
    console.log(`[achievements]   ${p.name}: ${perPlayer.get(p.id) ?? 0} verschillende achievements`)
  })

  return summary
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
