import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function ScoreInput({ match, onSaved }) {
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const s1 = parseInt(score1, 10)
  const s2 = parseInt(score2, 10)
  const sumOk =
    !isNaN(s1) && !isNaN(s2) && s1 >= 0 && s2 >= 0 && s1 + s2 === 12
  const canSave = sumOk

  useEffect(() => {
    if (score1 !== '' || score2 !== '') {
      if (!isNaN(s1) && !isNaN(s2) && s1 + s2 !== 12) {
        setError(`Som moet 12 zijn (nu: ${(isNaN(s1) ? 0 : s1) + (isNaN(s2) ? 0 : s2)})`)
      } else {
        setError('')
      }
    }
  }, [score1, score2])

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError('')

    // Call the RPC that updates scores + player stats atomically
    const { error: rpcErr } = await supabase.rpc('save_match_result', {
      p_match_id: match.id,
      p_score_team1: s1,
      p_score_team2: s2,
      p_team1_p1: match.team1[0].id,
      p_team1_p2: match.team1[1].id,
      p_team2_p1: match.team2[0].id,
      p_team2_p2: match.team2[1].id,
    })

    setSaving(false)
    if (rpcErr) {
      setError('Opslaan mislukt: ' + rpcErr.message)
    } else {
      onSaved()
    }
  }

  const teamName = (players) => players.map((p) => p.name).join(' & ')

  return (
    <div className="card">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Huidige wedstrijd
      </h2>

      {/* Teams row */}
      <div className="flex items-center justify-between gap-2 mb-6">
        {/* Team 1 */}
        <div className="flex-1 text-center">
          <p className="font-bold text-gray-900 text-sm leading-tight">
            {match.team1[0].name}
          </p>
          <p className="text-xs text-gray-400 my-0.5">&</p>
          <p className="font-bold text-gray-900 text-sm leading-tight">
            {match.team1[1].name}
          </p>
        </div>

        {/* Scores */}
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={12}
            value={score1}
            onChange={(e) => setScore1(e.target.value)}
            className="score-input"
            placeholder="0"
          />
          <span className="text-2xl font-light text-gray-300">–</span>
          <input
            type="number"
            min={0}
            max={12}
            value={score2}
            onChange={(e) => setScore2(e.target.value)}
            className="score-input"
            placeholder="0"
          />
        </div>

        {/* Team 2 */}
        <div className="flex-1 text-center">
          <p className="font-bold text-gray-900 text-sm leading-tight">
            {match.team2[0].name}
          </p>
          <p className="text-xs text-gray-400 my-0.5">&</p>
          <p className="font-bold text-gray-900 text-sm leading-tight">
            {match.team2[1].name}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-xs text-center mb-3">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className="btn-primary w-full py-3"
      >
        {saving ? 'Opslaan...' : 'Opslaan'}
      </button>
    </div>
  )
}
