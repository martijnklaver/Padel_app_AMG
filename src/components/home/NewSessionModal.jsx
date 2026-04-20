import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { maxUniqueMatches, generateSchedule } from '../../utils/tournament'

export default function NewSessionModal({ players, onCreated, onClose }) {
  const today = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(today)
  const [selectedIds, setSelectedIds] = useState([])
  const [scoreMode, setScoreMode] = useState('points')
  const [pointsPerMatch, setPointsPerMatch] = useState(16)
  const [totalMatches, setTotalMatches] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const maxMatches = maxUniqueMatches(selectedIds.length)

  useEffect(() => {
    setTotalMatches(maxMatches)
  }, [maxMatches])

  const togglePlayer = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const canSubmit =
    selectedIds.length >= 4 &&
    selectedIds.length <= 5 &&
    totalMatches > 0 &&
    totalMatches <= maxMatches &&
    !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    try {
      // Mark any other active sessions as no longer active
      await supabase.from('sessions').update({ is_active: false }).eq('is_active', true)

      const { data: session, error: sessionErr } = await supabase
        .from('sessions')
        .insert({
          date,
          player_ids: selectedIds,
          score_mode: scoreMode,
          points_per_match: scoreMode === 'points' ? pointsPerMatch : null,
          total_matches: totalMatches,
          is_active: true,
          is_completed: false,
        })
        .select()
        .single()

      if (sessionErr) throw sessionErr

      const selectedPlayers = players.filter((p) => selectedIds.includes(p.id))
      const { schedule } = generateSchedule(selectedPlayers, totalMatches)

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">Nieuwe sessie</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>

          {/* Datum */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Spelers */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Spelers ({selectedIds.length} geselecteerd, kies 4 of 5)
            </label>
            <div className="space-y-2">
              {players.map((p) => (
                <label key={p.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => togglePlayer(p.id)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-gray-800">{p.name}</span>
                </label>
              ))}
            </div>
            {selectedIds.length > 0 && (selectedIds.length < 4 || selectedIds.length > 5) && (
              <p className="text-red-500 text-xs mt-1">Selecteer precies 4 of 5 spelers</p>
            )}
          </div>

          {/* Score mode */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Score mode</label>
            <div className="flex gap-3">
              {['points', 'games'].map((mode) => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={mode}
                    checked={scoreMode === mode}
                    onChange={() => setScoreMode(mode)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-gray-800">
                    {mode === 'points' ? 'Punten' : 'Games'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Punten per wedstrijd */}
          {scoreMode === 'points' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Punten per wedstrijd
              </label>
              <input
                type="number"
                min="1"
                value={pointsPerMatch}
                onChange={(e) => setPointsPerMatch(parseInt(e.target.value) || 16)}
                className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {/* Aantal wedstrijden */}
          {selectedIds.length >= 4 && selectedIds.length <= 5 && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aantal wedstrijden
              </label>
              <p className="text-xs text-gray-400 mb-2">Max unieke wedstrijden: {maxMatches}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTotalMatches((v) => Math.max(1, v - 1))}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
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
                  className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={() => setTotalMatches((v) => Math.min(maxMatches, v + 1))}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>
          )}

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
