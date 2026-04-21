import { useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function EditMatchDialog({ match, session, players, onSaved, onClose }) {
  const isPoints = session.score_mode === 'points'

  const [s1, setS1] = useState(String(match.score_team1 ?? ''))
  const [s2, setS2] = useState(String(match.score_team2 ?? ''))
  const [selected, setSelected] = useState(match.winner ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const playerName = (id) => players.find((p) => p.id === id)?.name ?? '?'

  const n1 = parseInt(s1) || 0
  const n2 = parseInt(s2) || 0
  const showWarn = isPoints && s1 !== '' && s2 !== '' && n1 + n2 !== session.points_per_match

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    let winner, score1, score2, norm1, norm2

    if (isPoints) {
      if (s1 === '' || s2 === '') { setSaving(false); return }
      winner = n1 > n2 ? 1 : n2 > n1 ? 2 : null
      score1 = n1; score2 = n2
    } else {
      if (!selected) { setSaving(false); return }
      winner = selected
      score1 = winner === 1 ? 1 : 0
      score2 = winner === 2 ? 1 : 0
    }

    norm1 = winner === 1 ? 1.0 : winner === 2 ? 0.0 : 0.5
    norm2 = winner === 2 ? 1.0 : winner === 1 ? 0.0 : 0.5

    try {
      const { error: mErr } = await supabase
        .from('matches')
        .update({
          score_team1: score1,
          score_team2: score2,
          winner,
          normalized_score_team1: norm1,
          normalized_score_team2: norm2,
        })
        .eq('id', match.id)
      if (mErr) throw mErr
      onSaved()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const t1 = `${playerName(match.team1_p1)} & ${playerName(match.team1_p2)}`
  const t2 = `${playerName(match.team2_p1)} & ${playerName(match.team2_p2)}`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Score bewerken</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <p className="text-xs text-gray-500 text-center mb-4">
          {t1} <span className="text-gray-300">vs</span> {t2}
        </p>

        {isPoints ? (
          <>
            <div className="flex items-center gap-3 justify-center mb-3">
              <input type="number" min="0" value={s1} onChange={(e) => setS1(e.target.value)}
                className="score-input" />
              <span className="text-gray-400 font-bold text-xl">–</span>
              <input type="number" min="0" value={s2} onChange={(e) => setS2(e.target.value)}
                className="score-input" />
            </div>
            {showWarn && (
              <p className="text-amber-500 text-xs text-center mb-3">
                Som is {n1 + n2}, verwacht {session.points_per_match}
              </p>
            )}
          </>
        ) : (
          <div className="flex gap-3 mb-4">
            {[1, 2].map((team) => (
              <button key={team}
                onClick={() => setSelected(team)}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                  selected === team ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {team === 1 ? t1 : t2}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Annuleren</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary">
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}
