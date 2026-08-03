import { useState } from 'react'
import { supabase, saveMatchPoppers } from '../../supabaseClient'
import PopperSection from './PopperSection'

export default function GamesScoreInput({ scheduleRow, session, players, nicknames, onSaved }) {
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [poppers, setPoppers] = useState({})

  const playerName = (id) => {
    const nick = nicknames?.[id]
    return nick?.trim() || players.find((p) => p.id === id)?.name || '?'
  }
  const team1 = `${playerName(scheduleRow.team1_p1)} & ${playerName(scheduleRow.team1_p2)}`
  const team2 = `${playerName(scheduleRow.team2_p1)} & ${playerName(scheduleRow.team2_p2)}`

  const matchPlayerIds = [scheduleRow.team1_p1, scheduleRow.team1_p2, scheduleRow.team2_p1, scheduleRow.team2_p2]

  const handleSave = async () => {
    if (!selected || saving) return
    setSaving(true)
    setError(null)

    const winner = selected

    try {
      const { data: match, error: mErr } = await supabase.from('matches').insert({
        session_id: session.id,
        round_number: scheduleRow.round_number,
        team1_p1: scheduleRow.team1_p1,
        team1_p2: scheduleRow.team1_p2,
        team2_p1: scheduleRow.team2_p1,
        team2_p2: scheduleRow.team2_p2,
        score_team1: winner === 1 ? 1 : 0,
        score_team2: winner === 2 ? 1 : 0,
        winner,
        normalized_score_team1: winner === 1 ? 1.0 : 0.0,
        normalized_score_team2: winner === 2 ? 1.0 : 0.0,
        is_completed: true,
      }).select().single()
      if (mErr) throw mErr

      const { error: sErr } = await supabase
        .from('schedule')
        .update({ is_completed: true })
        .eq('id', scheduleRow.id)
      if (sErr) throw sErr

      await saveMatchPoppers(match.id, session.id, scheduleRow, poppers)
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
          className={`flex-1 text-center font-semibold text-lg leading-tight rounded-xl py-3 px-2 transition-all ${
            selected === 1 ? 'text-primary bg-primary/10' : 'text-gray-800 hover:bg-gray-50'
          }`}
        >
          {team1}
          {selected === 1 && <div className="text-sm mt-0.5">🏆</div>}
        </button>

        <div className="shrink-0 w-10 text-center text-gray-300 font-bold text-xl">–</div>

        <button
          onClick={() => setSelected(2)}
          className={`flex-1 text-center font-semibold text-lg leading-tight rounded-xl py-3 px-2 transition-all ${
            selected === 2 ? 'text-primary bg-primary/10' : 'text-gray-800 hover:bg-gray-50'
          }`}
        >
          {team2}
          {selected === 2 && <div className="text-sm mt-0.5">🏆</div>}
        </button>
      </div>

      {error && <p className="text-red-500 text-xs text-center mb-2">{error}</p>}

      <PopperSection
        playerIds={matchPlayerIds}
        players={players}
        nicknames={nicknames}
        counts={poppers}
        onChange={setPoppers}
      />

      <button
        onClick={handleSave}
        disabled={!selected || saving}
        className="btn-primary w-full mt-4 flex items-center justify-center"
      >
        {saving ? (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : 'Opslaan'}
      </button>
    </div>
  )
}
