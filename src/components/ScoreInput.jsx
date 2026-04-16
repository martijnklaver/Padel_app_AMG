import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function ScoreInput({ scheduleRow, players, pointsPerMatch, courtNumber, onSaved }) {
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const s1 = parseInt(score1, 10)
  const s2 = parseInt(score2, 10)
  const sumOk = !isNaN(s1) && !isNaN(s2) && s1 >= 0 && s2 >= 0 && s1 + s2 === pointsPerMatch

  useEffect(() => {
    if (score1 !== '' || score2 !== '') {
      const a = isNaN(s1) ? 0 : s1
      const b = isNaN(s2) ? 0 : s2
      if (!isNaN(s1) && !isNaN(s2) && s1 + s2 !== pointsPerMatch) {
        setError(`Som moet ${pointsPerMatch} zijn (nu: ${a + b})`)
      } else {
        setError('')
      }
    }
  }, [score1, score2, pointsPerMatch])

  const handleSave = async () => {
    if (!sumOk || saving) return
    setSaving(true)
    setError('')

    const { error: rpcErr } = await supabase.rpc('save_match_result', {
      p_schedule_id:     scheduleRow.id,
      p_score_team1:     s1,
      p_score_team2:     s2,
      p_team1_p1:        scheduleRow.team1_p1,
      p_team1_p2:        scheduleRow.team1_p2,
      p_team2_p1:        scheduleRow.team2_p1,
      p_team2_p2:        scheduleRow.team2_p2,
      p_points_per_match: pointsPerMatch,
    })

    setSaving(false)
    if (rpcErr) {
      setError('Opslaan mislukt: ' + rpcErr.message)
    } else {
      onSaved()
    }
  }

  const name = (id) => players.find((p) => p.id === id)?.name ?? '?'

  return (
    <div className="card">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
        Baan {courtNumber}
      </h2>

      {scheduleRow.warning && (
        <p className="text-xs text-amber-600 mb-3">{scheduleRow.warning}</p>
      )}

      {/* Teams row */}
      <div className="flex items-center justify-between gap-2 mb-4 mt-3">
        <div className="flex-1 text-center">
          <p className="font-bold text-gray-900 text-sm leading-tight">{name(scheduleRow.team1_p1)}</p>
          <p className="text-xs text-gray-400 my-0.5">&</p>
          <p className="font-bold text-gray-900 text-sm leading-tight">{name(scheduleRow.team1_p2)}</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={pointsPerMatch}
            value={score1}
            onChange={(e) => setScore1(e.target.value)}
            className="score-input"
            placeholder="0"
          />
          <span className="text-2xl font-light text-gray-300">–</span>
          <input
            type="number"
            min={0}
            max={pointsPerMatch}
            value={score2}
            onChange={(e) => setScore2(e.target.value)}
            className="score-input"
            placeholder="0"
          />
        </div>

        <div className="flex-1 text-center">
          <p className="font-bold text-gray-900 text-sm leading-tight">{name(scheduleRow.team2_p1)}</p>
          <p className="text-xs text-gray-400 my-0.5">&</p>
          <p className="font-bold text-gray-900 text-sm leading-tight">{name(scheduleRow.team2_p2)}</p>
        </div>
      </div>

      {error && <p className="text-red-500 text-xs text-center mb-3">{error}</p>}

      <button
        onClick={handleSave}
        disabled={!sumOk || saving}
        className="btn-primary w-full py-3"
      >
        {saving ? 'Opslaan...' : 'Opslaan'}
      </button>
    </div>
  )
}
