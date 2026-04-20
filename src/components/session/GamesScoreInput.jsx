import { useState } from 'react'
import { supabase } from '../../supabaseClient'

// draft: bestaande matches-rij met is_completed=false (vooraf ingevuld)
export default function GamesScoreInput({ scheduleRow, session, players, onSaved, draft }) {
  const [selected, setSelected] = useState(draft?.winner ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const playerName = (id) => players.find((p) => p.id === id)?.name ?? '?'
  const team1 = `${playerName(scheduleRow.team1_p1)} & ${playerName(scheduleRow.team1_p2)}`
  const team2 = `${playerName(scheduleRow.team2_p1)} & ${playerName(scheduleRow.team2_p2)}`

  const handleSave = async () => {
    if (!selected || saving) return
    setSaving(true)
    setError(null)

    const winner = selected
    const norm1 = winner === 1 ? 1.0 : 0.0
    const norm2 = winner === 2 ? 1.0 : 0.0

    const matchData = {
      session_id: session.id,
      round_number: scheduleRow.round_number,
      team1_p1: scheduleRow.team1_p1,
      team1_p2: scheduleRow.team1_p2,
      team2_p1: scheduleRow.team2_p1,
      team2_p2: scheduleRow.team2_p2,
      score_team1: winner === 1 ? 1 : 0,
      score_team2: winner === 2 ? 1 : 0,
      winner,
      normalized_score_team1: norm1,
      normalized_score_team2: norm2,
      is_completed: true,
    }

    try {
      if (draft) {
        const { error: mErr } = await supabase.from('matches').update(matchData).eq('id', draft.id)
        if (mErr) throw mErr
      } else {
        const { error: mErr } = await supabase.from('matches').insert(matchData)
        if (mErr) throw mErr
      }

      const { error: sErr } = await supabase
        .from('schedule')
        .update({ is_completed: true })
        .eq('id', scheduleRow.id)
      if (sErr) throw sErr

      onSaved()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setSelected(1)}
          className={`flex-1 text-right font-semibold text-lg leading-tight rounded-xl py-3 px-2 transition-all ${
            selected === 1 ? 'text-primary bg-primary/10' : 'text-gray-800 hover:bg-gray-50'
          }`}
        >
          {team1}
          {selected === 1 && <div className="text-sm mt-0.5">🏆</div>}
        </button>

        <div className="shrink-0 w-10 text-center text-gray-300 font-bold text-xl">–</div>

        <button
          onClick={() => setSelected(2)}
          className={`flex-1 text-left font-semibold text-lg leading-tight rounded-xl py-3 px-2 transition-all ${
            selected === 2 ? 'text-primary bg-primary/10' : 'text-gray-800 hover:bg-gray-50'
          }`}
        >
          {team2}
          {selected === 2 && <div className="text-sm mt-0.5">🏆</div>}
        </button>
      </div>

      {error && <p className="text-red-500 text-xs text-center mb-2">{error}</p>}

      <button
        onClick={handleSave}
        disabled={!selected || saving}
        className="btn-primary w-full"
      >
        {saving ? 'Opslaan...' : 'Opslaan'}
      </button>
    </div>
  )
}
