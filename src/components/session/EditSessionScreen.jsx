import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'

function EditMatchRow({ scheduleRow, match, session, players, onSaved }) {
  const isPoints = session.score_mode === 'points'
  const [s1, setS1] = useState(match ? String(match.score_team1 ?? '') : '')
  const [s2, setS2] = useState(match ? String(match.score_team2 ?? '') : '')
  const [selectedWinner, setSelectedWinner] = useState(match?.winner ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const playerName = (id) => players.find((p) => p.id === id)?.name ?? '?'
  const t1 = `${playerName(scheduleRow.team1_p1)} & ${playerName(scheduleRow.team1_p2)}`
  const t2 = `${playerName(scheduleRow.team2_p1)} & ${playerName(scheduleRow.team2_p2)}`

  const n1 = parseInt(s1) || 0
  const n2 = parseInt(s2) || 0

  const canSave = isPoints ? (s1 !== '' && s2 !== '') : selectedWinner !== null

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setError(null)

    let score1, score2, winner, norm1, norm2
    if (isPoints) {
      score1 = n1; score2 = n2
      winner = n1 > n2 ? 1 : n2 > n1 ? 2 : null
    } else {
      winner = selectedWinner
      score1 = winner === 1 ? 1 : 0
      score2 = winner === 2 ? 1 : 0
    }
    norm1 = winner === 1 ? 1.0 : winner === 2 ? 0.0 : 0.5
    norm2 = winner === 2 ? 1.0 : winner === 1 ? 0.0 : 0.5

    const payload = {
      score_team1: score1, score_team2: score2,
      winner, normalized_score_team1: norm1, normalized_score_team2: norm2,
    }

    let err
    if (match) {
      const { error: e } = await supabase.from('matches').update(payload).eq('id', match.id)
      err = e
    } else {
      const { error: e } = await supabase.from('matches').insert({
        ...payload,
        session_id: session.id,
        round_number: scheduleRow.round_number,
        team1_p1: scheduleRow.team1_p1, team1_p2: scheduleRow.team1_p2,
        team2_p1: scheduleRow.team2_p1, team2_p2: scheduleRow.team2_p2,
        is_completed: true,
      })
      if (!e) {
        await supabase.from('schedule').update({ is_completed: true }).eq('id', scheduleRow.id)
      }
      err = e
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onSaved()
  }

  return (
    <div className="card">
      {/* Team names */}
      <div className="flex items-center justify-between text-sm font-semibold text-gray-800 mb-4">
        <span className="flex-1 text-left leading-tight">{t1}</span>
        <span className="text-gray-300 mx-3">vs</span>
        <span className="flex-1 text-right leading-tight">{t2}</span>
      </div>

      {isPoints ? (
        <div className="flex items-center justify-center gap-4 mb-4">
          <input
            type="number"
            min="0"
            value={s1}
            onChange={(e) => setS1(e.target.value)}
            placeholder="0"
            className="score-input"
          />
          <span className="text-gray-400 font-bold text-2xl">–</span>
          <input
            type="number"
            min="0"
            value={s2}
            onChange={(e) => setS2(e.target.value)}
            placeholder="0"
            className="score-input"
          />
        </div>
      ) : (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedWinner(1)}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
              selectedWinner === 1 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t1}
          </button>
          <button
            onClick={() => setSelectedWinner(2)}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
              selectedWinner === 2 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t2}
          </button>
        </div>
      )}

      {error && <p className="text-red-500 text-xs text-center mb-2">{error}</p>}

      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className={`w-full font-semibold px-4 py-2 rounded-lg transition-all ${
          saved
            ? 'bg-green-500 text-white'
            : 'btn-primary disabled:opacity-40'
        }`}
      >
        {saving ? 'Opslaan...' : saved ? '✓ Score bijgewerkt' : 'Opslaan'}
      </button>
    </div>
  )
}

export default function EditSessionScreen({ session, players, onDone }) {
  const [schedule, setSchedule] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(session.date)
  const [dateSaved, setDateSaved] = useState(false)
  const [location, setLocation] = useState(session.location ?? '')
  const [locationSaved, setLocationSaved] = useState(false)

  const fetchData = useCallback(async () => {
    const [{ data: sch }, { data: mch }] = await Promise.all([
      supabase.from('schedule').select('*').eq('session_id', session.id).order('round_number'),
      supabase.from('matches').select('*').eq('session_id', session.id).order('round_number'),
    ])
    setSchedule(sch ?? [])
    setMatches(mch ?? [])
    setLoading(false)
  }, [session.id])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDateBlur = async () => {
    if (date === session.date) return
    await supabase.from('sessions').update({ date }).eq('id', session.id)
    setDateSaved(true)
    setTimeout(() => setDateSaved(false), 2000)
  }

  const handleLocationBlur = async () => {
    if (location.trim() === (session.location ?? '')) return
    await supabase.from('sessions').update({ location: location.trim() }).eq('id', session.id)
    setLocationSaved(true)
    setTimeout(() => setLocationSaved(false), 2000)
  }

  const findMatch = (row) =>
    matches.find(
      (m) =>
        m.session_id === session.id &&
        m.round_number === row.round_number &&
        ((m.team1_p1 === row.team1_p1 && m.team1_p2 === row.team1_p2) ||
          (m.team1_p1 === row.team1_p2 && m.team1_p2 === row.team1_p1))
    )

  // When schedule is empty (e.g. session stopped before rounds started),
  // fall back to building rows from the matches table directly.
  const effectiveRows = schedule.length > 0
    ? schedule
    : matches.map((m) => ({
        id: `match-${m.id}`,
        session_id: m.session_id,
        round_number: m.round_number,
        team1_p1: m.team1_p1,
        team1_p2: m.team1_p2,
        team2_p1: m.team2_p1,
        team2_p2: m.team2_p2,
      }))

  const rounds = [...new Set(effectiveRows.map((r) => r.round_number))].sort((a, b) => a - b)

  return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      <div className="flex items-center gap-3 mb-5 pt-2">
        <h2 className="text-xl font-bold text-gray-900 flex-1">Sessie bewerken</h2>
      </div>

      {/* Datum */}
      <div className="card mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Datum</label>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onBlur={handleDateBlur}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {dateSaved && <span className="text-green-600 text-sm font-medium shrink-0">✓ Opgeslagen</span>}
        </div>
      </div>

      {/* Locatie */}
      <div className="card mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Locatie</label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={handleLocationBlur}
            placeholder='bijv. "Spanje"'
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {locationSaved && <span className="text-green-600 text-sm font-medium shrink-0">✓ Opgeslagen</span>}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8">Laden...</p>
      ) : rounds.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Geen wedstrijden gevonden voor deze sessie.</p>
      ) : (
        <div className="space-y-5">
          {rounds.map((roundNum) => {
            const rows = effectiveRows.filter((r) => r.round_number === roundNum)
            return (
              <div key={roundNum}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Ronde {roundNum}
                </p>
                <div className="space-y-3">
                  {rows.map((row) => (
                    <EditMatchRow
                      key={row.id}
                      scheduleRow={row}
                      match={findMatch(row)}
                      session={session}
                      players={players}
                      onSaved={fetchData}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sticky footer */}
      <div className="fixed bottom-16 left-0 right-0 md:bottom-0 bg-white border-t border-gray-100 px-4 py-3 z-40">
        <div className="max-w-lg mx-auto">
          <button onClick={onDone} className="btn-primary w-full">
            Klaar met bewerken
          </button>
        </div>
      </div>
    </div>
  )
}
