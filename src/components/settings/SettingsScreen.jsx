import { useState, useEffect, useCallback } from 'react'
import { Paperclip } from 'lucide-react'
import { supabase, uploadPlayerAvatar, syncAchievements } from '../../supabaseClient'
import { computeBestDuo } from '../../utils/tournament'
import { ACHIEVEMENTS, computeAchievementEvents, summarizeAchievements } from '../../utils/achievements'
import PlayerAvatar from '../shared/PlayerAvatar'
import PhotoPreviewModal from '../shared/PhotoPreviewModal'

const dateStr = (d) =>
  new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })

function AchievementBadge({ meta, earned }) {
  const [expanded, setExpanded] = useState(false)

  if (!earned) {
    return (
      <span className="text-xs bg-gray-50 text-gray-400 border border-gray-200 px-2 py-1 rounded-full opacity-50 whitespace-nowrap">
        {meta.icon} {meta.label}
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-full whitespace-nowrap hover:border-amber-400 transition-colors"
      >
        {meta.icon} {meta.label}{earned.count > 1 ? ` ×${earned.count}` : ''}
      </button>
      {expanded && (
        <div className="basis-full text-[11px] text-gray-500 pl-1 -mt-0.5">
          Eerste keer behaald: {dateStr(earned.firstAchievedAt)}
          {earned.count > 1 && <> · Laatste keer behaald: {dateStr(earned.lastAchievedAt)}</>}
        </div>
      )}
    </>
  )
}

function BestDuoLine({ player, duos }) {
  const mine = duos.find((d) => d.ids.includes(player.id) && d.winPct !== null)
  if (!mine) return null
  const partnerIdx = mine.ids[0] === player.id ? 1 : 0
  return (
    <p className="text-xs text-gray-500 mb-3">
      🤝 Beste duo: <span className="font-medium text-gray-700">{mine.names[partnerIdx]}</span> — {mine.winPct}% samen
    </p>
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
  const [previewPlayer, setPreviewPlayer] = useState(null)
  const [allMatches, setAllMatches] = useState([])
  const [achievementsByPlayer, setAchievementsByPlayer] = useState(new Map())
  const [statsLoading, setStatsLoading] = useState(true)

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

  const handleAvatarDelete = async (player) => {
    await supabase.storage.from('avatars').remove([`${player.id}.jpg`])
    await supabase.from('players').update({ avatar_url: null }).eq('id', player.id)
    onPlayersUpdated(players.map((p) => p.id === player.id ? { ...p, avatar_url: null } : p))
  }

  return (
    <div className="w-full max-w-lg mx-auto p-4 pb-24 overflow-x-hidden">
      <h2 className="text-xl font-bold text-gray-900 mb-1 pt-2">Spelersprofielen</h2>
      <p className="text-sm text-gray-500 mb-6">Profielen, foto's en achievements</p>

      <div className="space-y-3 w-full">
        {players.map((player) => {
          const earnedMap = achievementsByPlayer.get(player.id) ?? new Map()
          return (
            <div key={player.id} className="card w-full overflow-hidden">
              {/* Grote profielfoto */}
              <div className="flex flex-col items-center mb-3">
                <button
                  type="button"
                  onClick={() => player.avatar_url && setPreviewPlayer(player)}
                  className={player.avatar_url ? 'cursor-pointer' : 'cursor-default'}
                >
                  <PlayerAvatar player={player} size={88} />
                </button>
              </div>

              {/* Naam */}
              <div className="flex items-center gap-3 mb-3 w-full">
                <input
                  type="text"
                  value={names[player.id]}
                  onChange={(e) => setNames((n) => ({ ...n, [player.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave(player)}
                  className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Opslaan knop */}
              <button
                onClick={() => handleSave(player)}
                disabled={saving[player.id] || names[player.id].trim() === player.name}
                className="btn-primary text-sm w-full mb-3 disabled:opacity-40"
              >
                {saving[player.id] ? '...' : saved[player.id] ? '✓ Opgeslagen' : 'Opslaan'}
              </button>

              {/* Beste duo partner */}
              <BestDuoLine player={player} duos={duos} />

              {/* Foto knoppen */}
              {uploading[player.id] ? (
                <p className="text-xs text-gray-400">Uploaden...</p>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex gap-2 w-full">
                    <label className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-primary cursor-pointer border border-gray-200 rounded-lg px-2.5 py-2 hover:border-primary/40 transition-colors">
                      📸 Foto maken
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={(e) => { handleAvatarUpload(player, e.target.files[0]); e.target.value = '' }}
                      />
                    </label>
                    <label className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-primary cursor-pointer border border-gray-200 rounded-lg px-2.5 py-2 hover:border-primary/40 transition-colors">
                      <Paperclip size={16} />
                      Foto uploaden
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { handleAvatarUpload(player, e.target.files[0]); e.target.value = '' }}
                      />
                    </label>
                  </div>
                  {player.avatar_url && (
                    <button
                      onClick={() => handleAvatarDelete(player)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors text-left"
                    >
                      Foto verwijderen
                    </button>
                  )}
                </div>
              )}

              {avatarSaved[player.id] && (
                <p className="text-xs text-green-600 font-medium mt-2">Foto opgeslagen ✓</p>
              )}
              {avatarError[player.id] && (
                <p className="text-xs text-red-500 mt-2">{avatarError[player.id]}</p>
              )}

              {/* Achievements */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Achievements</p>
                {statsLoading ? (
                  <p className="text-xs text-gray-400">Laden...</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(ACHIEVEMENTS).map(([key, meta]) => (
                      <AchievementBadge key={key} meta={meta} earned={earnedMap.get(key)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {previewPlayer && (
        <PhotoPreviewModal player={previewPlayer} onClose={() => setPreviewPlayer(null)} />
      )}
    </div>
  )
}
