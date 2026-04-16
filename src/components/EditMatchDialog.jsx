import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function EditMatchDialog({ row, players, pointsPerMatch, onSaved, onClose }) {
  const [score1, setScore1] = useState(String(row.score_team1 ?? ''))
  const [score2, setScore2] = useState(String(row.score_team2 ?? ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDeviation, setShowDeviation] = useState(false)

  const s1 = parseInt(score1, 10)
  const s2 = parseInt(score2, 10)
  const canSave = !isNaN(s1) && !isNaN(s2) && s1 >= 0 && s2 >= 0

  const name = (id) => players.find((p) => p.id === id)?.name ?? '?'

  const doSave = async () => {
    setShowDeviation(false)
    setSaving(true)
    setError('')

    const oldSum = (row.score_team1 ?? 0) + (row.score_team2 ?? 0)
    const newSum = s1 + s2

    const { error: rpcErr } = await supabase.rpc('update_match_result', {
      p_schedule_id:         row.id,
      p_old_score_team1:     row.score_team1 ?? 0,
      p_old_score_team2:     row.score_team2 ?? 0,
      p_new_score_team1:     s1,
      p_new_score_team2:     s2,
      p_old_points_per_match: oldSum,
      p_new_points_per_match: newSum,
      p_team1_p1:            row.team1_p1,
      p_team1_p2:            row.team1_p2,
      p_team2_p1:            row.team2_p1,
      p_team2_p2:            row.team2_p2,
    })

    setSaving(false)
    if (rpcErr) {
      setError('Opslaan mislukt: ' + rpcErr.message)
    } else {
      onSaved()
    }
  }

  const handleSave = () => {
    if (!canSave || saving) return
    if (s1 + s2 !== pointsPerMatch) {
      setShowDeviation(true)
    } else {
      doSave()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <p className="font-semibold text-gray-900 mb-1">Score aanpassen</p>
        <p className="text-xs text-gray-400 mb-4">
          Baan {row.court_number} — Ronde {row.round_number}
        </p>

        <div className="flex items-center justify-between gap-2 mb-5">
          <div className="flex-1 text-center text-sm">
            <p className="font-bold text-gray-900 leading-tight">{name(row.team1_p1)}</p>
            <p className="text-xs text-gray-400 my-0.5">&</p>
            <p className="font-bold text-gray-900 leading-tight">{name(row.team1_p2)}</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              className="score-input"
            />
            <span className="text-xl font-light text-gray-300">–</span>
            <input
              type="number"
              min={0}
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              className="score-input"
            />
          </div>

          <div className="flex-1 text-center text-sm">
            <p className="font-bold text-gray-900 leading-tight">{name(row.team2_p1)}</p>
            <p className="text-xs text-gray-400 my-0.5">&</p>
            <p className="font-bold text-gray-900 leading-tight">{name(row.team2_p2)}</p>
          </div>
        </div>

        {error && <p className="text-red-500 text-xs text-center mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Annuleren</button>
          <button onClick={handleSave} disabled={!canSave || saving} className="btn-primary flex-1">
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>

      {/* Deviation warning */}
      {showDeviation && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-xl mb-1">⚠️</p>
            <p className="font-semibold text-gray-900 mb-2">Score wijkt af</p>
            <p className="text-sm text-gray-500 mb-6">
              De totale score ({s1 + s2}) wijkt af van het ingestelde aantal punten ({pointsPerMatch}).
              Weet je zeker dat je deze score wilt opslaan?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeviation(false)} className="btn-secondary flex-1">
                Annuleren
              </button>
              <button onClick={doSave} className="btn-primary flex-1">
                Toch opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
