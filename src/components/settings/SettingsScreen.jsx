import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, uploadPlayerAvatar, syncAchievements } from '../../supabaseClient'
import { computeBestDuo } from '../../utils/tournament'
import { ACHIEVEMENTS, STACKABLE_ACHIEVEMENT_KEYS, computeAchievementEvents, summarizeAchievements } from '../../utils/achievements'
import PlayerAvatar from '../shared/PlayerAvatar'
import AchievementTooltip from '../shared/AchievementTooltip'
import AchievementsOverviewScreen from './AchievementsOverviewScreen'

const GOLD_GRADIENT = 'linear-gradient(145deg, #FFE873, #FFD700 55%, #E6BE00)'
const ORANGE_GRADIENT = 'linear-gradient(145deg, #FF9F5A, #EF7D2D 55%, #D9661C)'

const dateStr = (d) =>
  new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })

const clampStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

// Echte "medaille"-vormige badge: rond, met rand + schaduw voor diepte, teller
// als los bolletje erop, en klik-uitleg als los balloontje (net als op de
// achievements-overzichtpagina) i.p.v. een uitklappende rij.
function AchievementBadge({ meta, earned, stackable }) {
  const [anchorRect, setAnchorRect] = useState(null)

  if (!earned) return null

  const gradient = stackable ? ORANGE_GRADIENT : GOLD_GRADIENT
  const iconTextClass = stackable ? 'text-white' : 'text-gray-900'

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={(e) => setAnchorRect((prev) => (prev ? null : e.currentTarget.getBoundingClientRect()))}
        className={`relative w-12 h-12 rounded-full ring-2 ring-white shadow-md flex items-center justify-center text-xl hover:scale-105 active:scale-95 transition-transform ${iconTextClass}`}
        style={{ background: gradient }}
      >
        {meta.icon}
        {stackable && earned.count > 1 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none ring-2 ring-white">
            {earned.count}
          </span>
        )}
      </button>
      <span className="text-[9px] font-medium text-gray-600 text-center leading-tight w-full" style={clampStyle}>
        {meta.label}
      </span>

      <AchievementTooltip anchorRect={anchorRect} onClose={() => setAnchorRect(null)}>
        <p className="font-semibold">{meta.label}{stackable && earned.count > 1 ? ` ×${earned.count}` : ''}</p>
        {meta.description && <p className="text-white/80 mt-0.5">{meta.description}</p>}
        <p className="text-white/60 mt-1">
          Eerste keer: {dateStr(earned.firstAchievedAt)}
          {earned.count > 1 && (
            <>
              <br />
              Laatste keer: {dateStr(earned.lastAchievedAt)}
            </>
          )}
        </p>
      </AchievementTooltip>
    </div>
  )
}

function bestDuoFor(player, duos) {
  const mine = duos.find((d) => d.ids.includes(player.id) && d.winPct !== null)
  if (!mine) return null
  const partnerIdx = mine.ids[0] === player.id ? 1 : 0
  return { partnerName: mine.names[partnerIdx], pct: mine.winPct }
}

export default function SettingsScreen({ players, onPlayersUpdated }) {
  const [view, setView] = useState('profile')
  const [activePlayerId, setActivePlayerId] = useState(() => players[0]?.id ?? null)
  const [names, setNames] = useState(() =>
    Object.fromEntries(players.map((p) => [p.id, p.name]))
  )
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [uploading, setUploading] = useState({})
  const [avatarSaved, setAvatarSaved] = useState({})
  const [avatarError, setAvatarError] = useState({})
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false)
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

  if (view === 'achievements') {
    return (
      <AchievementsOverviewScreen
        players={players}
        achievementsByPlayer={achievementsByPlayer}
        onBack={() => setView('profile')}
      />
    )
  }

  const activePlayer = players.find((p) => p.id === activePlayerId) ?? players[0]
  if (!activePlayer) {
    return (
      <div className="w-full max-w-lg mx-auto p-4 pt-2">
        <h2 className="text-xl font-bold text-gray-900">Spelersprofiel</h2>
        <p className="text-sm text-gray-500 mt-2">Nog geen spelers</p>
      </div>
    )
  }

  const earnedMap = achievementsByPlayer.get(activePlayer.id) ?? new Map()
  const isUnchanged = names[activePlayer.id].trim() === activePlayer.name
  const duo = bestDuoFor(activePlayer, duos)

  return (
    <div className="w-full max-w-lg mx-auto p-4 overflow-x-hidden">
      {/* Avatarnavigatie */}
      <div className="flex items-center gap-3 mb-3 overflow-x-auto -mx-4 px-4 pb-1">
        {players.map((p) => {
          const active = p.id === activePlayer.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => { setActivePlayerId(p.id); setPhotoMenuOpen(false) }}
              className="shrink-0 flex flex-col items-center gap-1"
            >
              <div className={active ? 'rounded-full ring-2 ring-primary ring-offset-2 ring-offset-gray-50' : ''}>
                <PlayerAvatar player={p} size={active ? 52 : 40} />
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-gray-400'}`}>{p.name}</span>
            </button>
          )
        })}
      </div>

      {/* Titel + link naar achievements-overzicht */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-gray-900">Spelersprofiel</h2>
        <button
          onClick={() => setView('achievements')}
          className="shrink-0 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors whitespace-nowrap"
        >
          🏅 Alle achievements
        </button>
      </div>

      {/* Profielkaart van de actieve speler */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <input
          ref={(el) => { getRefs(activePlayer.id).camera = el }}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => { handleAvatarUpload(activePlayer, e.target.files[0]); e.target.value = '' }}
        />
        <input
          ref={(el) => { getRefs(activePlayer.id).gallery = el }}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { handleAvatarUpload(activePlayer, e.target.files[0]); e.target.value = '' }}
        />

        {/* Profielfoto — klikbaar, opent camera/galerij-menu */}
        <div className="flex flex-col items-center mb-2">
          <div className="relative">
            <button type="button" onClick={() => setPhotoMenuOpen((v) => !v)} className="cursor-pointer block">
              <PlayerAvatar player={activePlayer} size={80} />
            </button>
            <button
              type="button"
              onClick={() => setPhotoMenuOpen((v) => !v)}
              className="absolute bottom-0 right-0 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm text-sm"
              title="Foto aanpassen"
            >
              📷
            </button>

            {uploading[activePlayer.id] && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full text-xs text-gray-400">···</div>
            )}

            {photoMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPhotoMenuOpen(false)} />
                <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setPhotoMenuOpen(false); getRefs(activePlayer.id).camera?.click() }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    📸 Foto maken
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPhotoMenuOpen(false); getRefs(activePlayer.id).gallery?.click() }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    🖼️ Uit galerij kiezen
                  </button>
                </div>
              </>
            )}
          </div>

          {avatarSaved[activePlayer.id] && (
            <p className="text-xs text-green-600 font-medium mt-1.5">Foto opgeslagen ✓</p>
          )}
          {avatarError[activePlayer.id] && (
            <p className="text-xs text-red-500 mt-1.5">{avatarError[activePlayer.id]}</p>
          )}
        </div>

        {/* Naam + opslaan */}
        <div className="flex items-center gap-2 mb-1.5 w-full">
          <input
            type="text"
            value={names[activePlayer.id]}
            onChange={(e) => setNames((n) => ({ ...n, [activePlayer.id]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleSave(activePlayer)}
            className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={() => handleSave(activePlayer)}
            disabled={saving[activePlayer.id] || isUnchanged}
            className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:cursor-not-allowed ${
              isUnchanged
                ? 'bg-gray-100 text-gray-400'
                : 'bg-primary text-white hover:bg-primary-hover disabled:opacity-60'
            }`}
          >
            {saving[activePlayer.id] ? '...' : saved[activePlayer.id] ? '✓' : 'Opslaan'}
          </button>
        </div>

        {/* Beste duo */}
        {duo && (
          <p className="text-xs text-gray-400 text-center mb-3">
            🤝 {duo.partnerName} — {duo.pct}%
          </p>
        )}

        {/* Achievements */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">🏅 Achievements</p>
          {statsLoading ? (
            <p className="text-xs text-gray-400">Laden...</p>
          ) : earnedMap.size === 0 ? (
            <p className="text-xs text-gray-400">Nog geen achievements behaald</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {[...earnedMap.entries()].map(([key, earned]) => (
                <AchievementBadge
                  key={key}
                  meta={ACHIEVEMENTS[key]}
                  earned={earned}
                  stackable={STACKABLE_ACHIEVEMENT_KEYS.has(key)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
