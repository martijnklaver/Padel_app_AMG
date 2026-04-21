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

  const showMatchCount = selectedIds.length >= 4 && selectedIds.length <= 5

  return (
    // Overlay: full-screen on mobile, centered modal on sm+
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      {/* Modal: full-height on mobile, constrained on sm+ */}
      <div className="bg-white w-full h-full sm:h-auto sm:rounded-2xl sm:max-w-md sm:max-h-[90vh] flex flex-col">

        {/* Header — fixed at top */}
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
                    className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      checked
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary/40'
                    }`}
                  >
                    {p.name}
                  </button>
                )
              })}
            </div>
            {selectedIds.length > 0 && (selectedIds.length < 4 || selectedIds.length > 5) && (
              <p className="text-red-500 text-xs mt-1">Selecteer precies 4 of 5 spelers</p>
            )}
          </div>

          {/* Score mode */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Score mode</label>
            <div className="flex gap-2">
              {['points', 'games'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setScoreMode(mode)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    scoreMode === mode
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-primary/40'
                  }`}
                >
                  {mode === 'points' ? 'Punten' : 'Games'}
                </button>
              ))}
            </div>
          </div>

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
                  Wedstrijden <span className="text-gray-400 font-normal">(max {maxMatches})</span>
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

        {/* Sticky footer — Start sessie button always visible */}
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
