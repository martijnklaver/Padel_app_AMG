import { useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function GamesScoreInput({ scheduleRow, session, players, onSaved }) {
  const [selected, setSelected] = useState(null) // 1 or 2
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const playerName = (id) => players.find((p) => p.id === id)?.name ?? '?'

  const handleSave = async () => {
    if (!selected || saving) return
    setSaving(true)
    setError(null)

    const winner = selected
    const norm1 = winner === 1 ? 1.0 : 0.0
    const norm2 = winner === 2 ? 1.0 : 0.0

    try {
      const { error: mErr } = await supabase.from('matches').insert({
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
      })
      if (mErr) throw mErr

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
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setSelected(1)}
          className={`flex-1 py-4 rounded-xl font-semibold text-sm transition-all ${
            selected === 1
              ? 'bg-primary text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="font-bold">{playerName(scheduleRow.team1_p1)}</div>
          <div className="text-xs opacity-75">& {playerName(scheduleRow.team1_p2)}</div>
          <div className="mt-1 text-lg">{selected === 1 ? '🏆' : ''}</div>
        </button>
        <button
          onClick={() => setSelected(2)}
          className={`flex-1 py-4 rounded-xl font-semibold text-sm transition-all ${
            selected === 2
              ? 'bg-primary text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="font-bold">{playerName(scheduleRow.team2_p1)}</div>
          <div className="text-xs opacity-75">& {playerName(scheduleRow.team2_p2)}</div>
          <div className="mt-1 text-lg">{selected === 2 ? '🏆' : ''}</div>
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
