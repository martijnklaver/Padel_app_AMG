import { useState, useEffect, useRef } from 'react'
import { supabase, uploadPlayerAvatar } from '../../supabaseClient'
import { maxUniqueMatches, generateSchedule, generateFivePlayerSchedule } from '../../utils/tournament'
import { SCORE_MODES, SETS_FORMATS } from '../../utils/scoreModes'
import PlayerAvatar from '../shared/PlayerAvatar'

function shuffleIds(ids) {
  const a = [...ids]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateUniqueOrder(ids, recentOrders) {
  const recentSet = new Set(recentOrders.map((o) => o.join(',')))
  let result
  let attempts = 0
  do {
    result = shuffleIds(ids)
    attempts++
  } while (recentSet.has(result.join(',')) && attempts < 100)
  return result
}

export default function NewSessionModal({ players, onCreated, onClose, onPlayersUpdated }) {
  const today = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(today)
  const [location, setLocation] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [playerOrder, setPlayerOrder] = useState([])
  const [recentOrders, setRecentOrders] = useState(null)
  const [nicknames, setNicknames] = useState({})
  const [scoreMode, setScoreMode] = useState('points')
  const [setsFormat, setSetsFormat] = useState(3)
  const [pointsPerMatch, setPointsPerMatch] = useState(16)
  const [totalMatches, setTotalMatches] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState({})
  const [draggingId, setDraggingId] = useState(null)
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const dragStartYRef = useRef(0)

  const maxMatches = maxUniqueMatches(selectedIds.length)

  // Games & Sets is één reguliere wedstrijd (met meerdere sets), geen round-robin
  // van meerdere potjes — dus altijd precies 1 wedstrijd, niet instelbaar.
  useEffect(() => {
    setTotalMatches(scoreMode === 'games_sets' ? 1 : maxMatches)
  }, [maxMatches, scoreMode])

  // Haal de player_order van de laatste 3 sessies op voor uniekheidscontrole
  useEffect(() => {
    supabase
      .from('sessions')
      .select('player_order')
      .not('player_order', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setRecentOrders((data ?? []).map((s) => s.player_order)))
  }, [])

  // Genereer willekeurige volgorde zodra 5 spelers geselecteerd zijn
  useEffect(() => {
    if (selectedIds.length !== 5 || recentOrders === null) return
    setPlayerOrder((prev) => generateUniqueOrder(prev, recentOrders))
  }, [selectedIds.length, recentOrders])

  // Games & Sets is alleen beschikbaar bij 4 spelers
  useEffect(() => {
    if (selectedIds.length === 5 && scoreMode === 'games_sets') setScoreMode('points')
  }, [selectedIds.length, scoreMode])

  const togglePlayer = (id) => {
    if (selectedIds.includes(id)) {
      setNicknames((prev) => { const n = { ...prev }; delete n[id]; return n })
      setPlayerOrder((prev) => prev.filter((x) => x !== id))
    } else {
      setPlayerOrder((prev) => [...prev, id])
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // Spelersvolgorde slepen om te herordenen (muis + touch via Pointer Events)
  useEffect(() => {
    if (!draggingId) return

    const handleMove = (e) => {
      setDragOffsetY(e.clientY - dragStartYRef.current)

      const el = document.elementFromPoint(e.clientX, e.clientY)
      const overId = el?.closest('[data-player-order-id]')?.dataset.playerOrderId
      if (!overId || overId === draggingId) return
      setPlayerOrder((prev) => {
        const from = prev.indexOf(draggingId)
        const to = prev.indexOf(overId)
        if (from === -1 || to === -1 || from === to) return prev
        const next = [...prev]
        next.splice(from, 1)
        next.splice(to, 0, draggingId)
        return next
      })
    }

    const handleUp = () => {
      setDraggingId(null)
      setDragOffsetY(0)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [draggingId])

  const canSubmit =
    selectedIds.length >= 4 &&
    selectedIds.length <= 5 &&
    totalMatches > 0 &&
    totalMatches <= maxMatches &&
    location.trim() !== '' &&
    !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    try {
      await supabase.from('sessions').update({ is_active: false }).eq('is_active', true)

      const cleanNicknames = Object.fromEntries(
        Object.entries(nicknames).filter(([id, v]) => selectedIds.includes(id) && v?.trim())
      )

      const isFivePlayers = selectedIds.length === 5

      const { data: session, error: sessionErr } = await supabase
        .from('sessions')
        .insert({
          date,
          location: location.trim(),
          player_ids: selectedIds,
          score_mode: scoreMode,
          points_per_match: scoreMode === 'points' ? pointsPerMatch : null,
          sets_format: scoreMode === 'games_sets' ? setsFormat : null,
          total_matches: totalMatches,
          is_active: true,
          is_completed: false,
          nicknames: cleanNicknames,
          player_order: isFivePlayers ? playerOrder : null,
        })
        .select()
        .single()

      if (sessionErr) throw sessionErr

      let schedule
      if (isFivePlayers) {
        const orderedPlayers = playerOrder.map((id) => players.find((p) => p.id === id))
        ;({ schedule } = generateFivePlayerSchedule(orderedPlayers, totalMatches))
      } else {
        const selectedPlayers = players.filter((p) => selectedIds.includes(p.id))
        ;({ schedule } = generateSchedule(selectedPlayers, totalMatches))
      }

      const scheduleRows = schedule.flatMap(({ round, courts }) =>
        courts.map((court) => ({
          session_id: session.id,
          round_number: round,
          team1_p1: court.team1_p1.id,
          team1_p2: court.team1_p2.id,
          team2_p1: court.team2_p1.id,
          team2_p2: court.team2_p2.id,
          is_current: round === 1,
          is_completed: false,
        }))
      )

      const { error: schedErr } = await supabase.from('schedule').insert(scheduleRows)
      if (schedErr) throw schedErr

      onCreated(session)
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  const showMatchCount = selectedIds.length >= 4 && selectedIds.length <= 5 && scoreMode !== 'games_sets'
  const isFivePlayers = selectedIds.length === 5

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 pb-16 sm:pb-0">
      <div className="bg-white w-full h-full sm:h-auto sm:rounded-2xl sm:max-w-md sm:max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Nieuwe sessie</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* Datum */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Locatie */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Locatie</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder='bijv. "Spanje"'
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Spelers */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Spelers ({selectedIds.length}/5 geselecteerd — kies 4 of 5)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {players.map((p) => {
                const checked = selectedIds.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlayer(p.id)}
                    className={`py-2 px-2 rounded-lg border font-medium transition-colors flex flex-col items-center gap-1.5 ${
                      checked
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary/40'
                    }`}
                  >
                    <PlayerAvatar player={p} size={32} />
                    <span className="text-xs leading-tight text-center">{p.name}</span>
                  </button>
                )
              })}
            </div>
            {selectedIds.length > 0 && (selectedIds.length < 4 || selectedIds.length > 5) && (
              <p className="text-red-500 text-xs mt-1">Selecteer precies 4 of 5 spelers</p>
            )}
          </div>

          {/* Spelersvolgorde (alleen bij 5 spelers) */}
          {isFivePlayers && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                Spelersvolgorde <span className="text-gray-400 font-normal normal-case">(sleep om te herordenen)</span>
              </label>
              <div className="space-y-1">
                {playerOrder.map((id, i) => {
                  const player = players.find((p) => p.id === id)
                  const isDragging = draggingId === id
                  return (
                    <div
                      key={id}
                      data-player-order-id={id}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        dragStartYRef.current = e.clientY
                        setDragOffsetY(0)
                        setDraggingId(id)
                      }}
                      style={isDragging ? { transform: `translateY(${dragOffsetY}px)`, position: 'relative', zIndex: 10 } : undefined}
                      className={`flex items-center gap-2 py-1.5 px-3 bg-gray-50 rounded-lg touch-none select-none cursor-grab active:cursor-grabbing ${
                        isDragging ? 'shadow-lg ring-1 ring-primary/30' : ''
                      }`}
                    >
                      <span className="text-xs text-gray-400 w-14 shrink-0">Speler {i + 1}</span>
                      <span className="flex-1 text-sm font-medium text-gray-800">{player?.name}</span>
                      <span className="text-gray-300 text-sm shrink-0" aria-hidden="true">⠿</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Bijnamen */}
          {selectedIds.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                Bijnamen (optioneel)
              </label>
              <div className="space-y-2">
                {(isFivePlayers ? playerOrder : selectedIds).map((id) => {
                  const player = players.find((p) => p.id === id)
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <PlayerAvatar player={player} size={32} />
                        {uploading[id] ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full text-xs text-gray-400">·</div>
                        ) : (
                          <label className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center cursor-pointer shadow-sm hover:bg-gray-50 text-xs leading-none">
                            📷
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files[0]
                                e.target.value = ''
                                if (!file) return
                                setUploading(u => ({ ...u, [id]: true }))
                                const { url } = await uploadPlayerAvatar(id, file)
                                if (url) onPlayersUpdated?.(players.map(p => p.id === id ? { ...p, avatar_url: url } : p))
                                setUploading(u => ({ ...u, [id]: false }))
                              }}
                            />
                          </label>
                        )}
                      </div>
                      <span className="w-16 text-sm text-gray-600 truncate shrink-0">{player?.name}</span>
                      <input
                        type="text"
                        placeholder='bijv. "The Wall"'
                        value={nicknames[id] || ''}
                        onChange={(e) =>
                          setNicknames((prev) => ({ ...prev, [id]: e.target.value }))
                        }
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Score mode */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Score mode</label>
            <div className="flex gap-2">
              {SCORE_MODES.map(({ value, label }) => {
                const disabled = value === 'games_sets' && isFivePlayers
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setScoreMode(value)}
                    title={disabled ? 'Games & Sets is alleen beschikbaar bij 4 spelers' : undefined}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      scoreMode === value
                        ? 'bg-primary text-white border-primary'
                        : disabled
                          ? 'bg-white text-gray-300 border-gray-100 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary/40'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Best-of (alleen bij Games & Sets) */}
          {scoreMode === 'games_sets' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Formaat</label>
              <div className="flex gap-2">
                {SETS_FORMATS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSetsFormat(value)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      setsFormat === value
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary/40'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Punten per wedstrijd + Aantal wedstrijden */}
          {showMatchCount && (
            <div className="flex gap-3">
              {scoreMode === 'points' && (
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Punten/wedstrijd</label>
                  <input
                    type="number"
                    min="1"
                    value={pointsPerMatch}
                    onChange={(e) => setPointsPerMatch(parseInt(e.target.value) || 16)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
              <div className={scoreMode === 'points' ? 'flex-1' : 'w-full'}>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                  Wedstrijden <span className="text-gray-400 font-normal">(verwacht {maxMatches})</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTotalMatches((v) => Math.max(1, v - 1))}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 shrink-0"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={maxMatches}
                    value={totalMatches}
                    onChange={(e) => {
                      const v = Math.min(maxMatches, Math.max(1, parseInt(e.target.value) || 1))
                      setTotalMatches(v)
                    }}
                    className="flex-1 min-w-0 text-center border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setTotalMatches((v) => Math.min(maxMatches, v + 1))}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 px-4 py-4 bg-white border-t border-gray-100">
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn-primary w-full"
          >
            {submitting ? 'Bezig...' : 'Start sessie'}
          </button>
        </div>
      </div>
    </div>
  )
}
