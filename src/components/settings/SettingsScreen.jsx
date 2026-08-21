import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, uploadPlayerAvatar, syncAchievements } from '../../supabaseClient'
import { computeBestDuo } from '../../utils/tournament'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORY_COLORS, computeAchievementEvents, summarizeAchievements } from '../../utils/achievements'
import PlayerAvatar from '../shared/PlayerAvatar'

const dateStr = (d) =>
  new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })

function AchievementBadge({ meta, earned }) {
  const [expanded, setExpanded] = useState(false)

  if (!earned) return null

  const color = ACHIEVEMENT_CATEGORY_COLORS[meta.category] ?? '#EF7D2D'

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 text-white text-center hover:brightness-95 transition-[filter]"
        style={{ backgroundColor: color }}
      >
        {earned.count > 1 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
            {earned.count}
          </span>
        )}
        <span className="text-xl leading-none">{meta.icon}</span>
        <span className="text-[11px] font-semibold leading-tight">{meta.label}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded(false)}
      className="col-span-2 sm:col-span-3 text-left text-white rounded-2xl px-4 py-3"
      style={{ backgroundColor: color }}
    >
      <p className="text-sm font-bold flex items-center gap-1.5">
        {meta.icon} {meta.label}{earned.count > 1 ? ` ×${earned.count}` : ''}
      </p>
      {meta.description && <p className="text-xs text-white/90 mt-1">{meta.description}</p>}
      <p className="text-[11px] text-white/75 mt-1">
        Eerste keer: {dateStr(earned.firstAchievedAt)}
        {earned.count > 1 && (
          <>
            <br />
            Laatste keer: {dateStr(earned.lastAchievedAt)}
          </>
        )}
      </p>
    </button>
  )
}

function BestDuoLine({ player, duos }) {
  const mine = duos.find((d) => d.ids.includes(player.id) && d.winPct !== null)
  if (!mine) return null
  const partnerIdx = mine.ids[0] === player.id ? 1 : 0
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5 mb-3">
      <p className="text-xs text-gray-500">
        🤝 Beste duo: <span className="font-medium text-gray-700">{mine.names[partnerIdx]}</span> — {mine.winPct}% samen
      </p>
    </div>
  )
}

export default function SettingsScreen({ players, onPlayersUpdated }) {
  const [names, setNames] = useState(() =>
    Object.fromEntries(players.map((p) => [p.id, p.name]))
  )
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [uploading, setUploading] = useState({})
  const [avatarSaved, setAvatarSaved] = useState({})
  const [avatarError, setAvatarError] = useState({})
  const [photoMenuFor, setPhotoMenuFor] = useState(null)
  const [allMatches, setAllMatches] = useState([])
  const [achievementsByPlayer, setAchievementsByPlayer] = useState(new Map())
  const [statsLoading, setStatsLoading] = useState(true)
  const fileInputRefs = useRef({})

  const getRefs = (playerId) => {
    if (!fileInputRefs.current[playerId]) fileInputRefs.current[playerId] = {}
    return fileInputRefs.current[playerId]
  }

  const fetchAchievementData = useCallback(async () => {
    const [{ data: sessions }, { data: matches }, { data: poppers }] = await Promise.all([
      supabase.from('sessions').select('*'),
      supabase.from('matches').select('*').eq('is_completed', true),
      supabase.from('poppers').select('*'),
    ])
    setAllMatches(matches ?? [])

    const events = computeAchievementEvents(players, sessions ?? [], matches ?? [], poppers ?? [])
    const summary = summarizeAchievements(events)
    const byPlayer = new Map()
    summary.forEach((s) => {
      if (!byPlayer.has(s.player_id)) byPlayer.set(s.player_id, new Map())
      byPlayer.get(s.player_id).set(s.achievement_key, s)
    })
    setAchievementsByPlayer(byPlayer)
    setStatsLoading(false)
  }, [players])

  useEffect(() => {
    fetchAchievementData()
  }, [fetchAchievementData])

  // Vangnet: zorgt dat de opgeslagen achievements (count/achieved_at) bijblijven
  // met de werkelijke historie, ook als er een tijd geen sessie is afgesloten.
  useEffect(() => {
    if (players.length > 0) syncAchievements(players)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length])

  const duos = computeBestDuo(players, allMatches)

  const handleSave = async (player) => {
    const newName = names[player.id].trim()
    if (!newName || newName === player.name) return

    setSaving((s) => ({ ...s, [player.id]: true }))
    const { error } = await supabase
      .from('players')
      .update({ name: newName })
      .eq('id', player.id)

    if (!error) {
      onPlayersUpdated(players.map((p) => p.id === player.id ? { ...p, name: newName } : p))
      setSaved((s) => ({ ...s, [player.id]: true }))
      setTimeout(() => setSaved((s) => ({ ...s, [player.id]: false })), 2000)
    }
    setSaving((s) => ({ ...s, [player.id]: false }))
  }

  const handleAvatarUpload = async (player, file) => {
    if (!file) return
    setUploading((u) => ({ ...u, [player.id]: true }))
    setAvatarSaved((s) => ({ ...s, [player.id]: false }))
    setAvatarError((e) => ({ ...e, [player.id]: null }))

    const { error, url } = await uploadPlayerAvatar(player.id, file)

    if (error) {
      setAvatarError((e) => ({ ...e, [player.id]: error }))
    } else {
      onPlayersUpdated(players.map((p) => p.id === player.id ? { ...p, avatar_url: url } : p))
      setAvatarSaved((s) => ({ ...s, [player.id]: true }))
      setTimeout(() => setAvatarSaved((s) => ({ ...s, [player.id]: false })), 3000)
    }
    setUploading((u) => ({ ...u, [player.id]: false }))
  }

  return (
    <div className="w-full max-w-lg mx-auto p-4 pb-24 overflow-x-hidden">
      <h2 className="text-xl font-bold text-gray-900 mb-1 pt-2">Spelersprofiel</h2>
      <p className="text-sm text-gray-500 mb-6">Profielen, foto's en achievements</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {players.map((player) => {
          const earnedMap = achievementsByPlayer.get(player.id) ?? new Map()
          const isUnchanged = names[player.id].trim() === player.name
          return (
            <div key={player.id} className="p-4">
              <input
                ref={(el) => { getRefs(player.id).camera = el }}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => { handleAvatarUpload(player, e.target.files[0]); e.target.value = '' }}
              />
              <input
                ref={(el) => { getRefs(player.id).gallery = el }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { handleAvatarUpload(player, e.target.files[0]); e.target.value = '' }}
              />

              {/* Profielfoto — klikbaar, opent camera/galerij-menu */}
              <div className="flex flex-col items-center mb-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPhotoMenuFor((cur) => (cur === player.id ? null : player.id))}
                    className="cursor-pointer block"
                  >
                    <PlayerAvatar player={player} size={88} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoMenuFor((cur) => (cur === player.id ? null : player.id))}
                    className="absolute bottom-0 right-0 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm text-sm"
                    title="Foto aanpassen"
                  >
                    📷
                  </button>

                  {uploading[player.id] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full text-xs text-gray-400">···</div>
                  )}

                  {photoMenuFor === player.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setPhotoMenuFor(null)} />
                      <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => { setPhotoMenuFor(null); getRefs(player.id).camera?.click() }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          📸 Foto maken
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPhotoMenuFor(null); getRefs(player.id).gallery?.click() }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          🖼️ Uit galerij kiezen
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {avatarSaved[player.id] && (
                  <p className="text-xs text-green-600 font-medium mt-2">Foto opgeslagen ✓</p>
                )}
                {avatarError[player.id] && (
                  <p className="text-xs text-red-500 mt-2">{avatarError[player.id]}</p>
                )}
              </div>

              {/* Naam + opslaan */}
              <div className="flex items-center gap-2 mb-3 w-full">
                <input
                  type="text"
                  value={names[player.id]}
                  onChange={(e) => setNames((n) => ({ ...n, [player.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave(player)}
                  className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={() => handleSave(player)}
                  disabled={saving[player.id] || isUnchanged}
                  className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:cursor-not-allowed ${
                    isUnchanged
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-primary text-white hover:bg-primary-hover disabled:opacity-60'
                  }`}
                >
                  {saving[player.id] ? '...' : saved[player.id] ? '✓' : 'Opslaan'}
                </button>
              </div>

              {/* Beste duo partner */}
              <BestDuoLine player={player} duos={duos} />

              {/* Achievements */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">🏅 Achievements</p>
                {statsLoading ? (
                  <p className="text-xs text-gray-400">Laden...</p>
                ) : earnedMap.size === 0 ? (
                  <p className="text-xs text-gray-400">Nog geen achievements behaald</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[...earnedMap.entries()].map(([key, earned]) => (
                      <AchievementBadge key={key} meta={ACHIEVEMENTS[key]} earned={earned} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
