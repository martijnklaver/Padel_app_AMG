import { useState } from 'react'
import { supabase, saveMatchPoppers } from '../../supabaseClient'
import PopperSection from './PopperSection'
import PlayerAvatar from '../shared/PlayerAvatar'

export default function PointsScoreInput({ scheduleRow, session, players, nicknames, onSaved }) {
  const [s1, setS1] = useState('')
  const [s2, setS2] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [poppers, setPoppers] = useState({})

  const n1 = parseInt(s1) || 0
  const n2 = parseInt(s2) || 0
  const sumOk = n1 + n2 === session.points_per_match
  const showWarn = s1 !== '' && s2 !== '' && !sumOk

  const playerName = (id) => {
    const nick = nicknames?.[id]
    return nick?.trim() || players.find((p) => p.id === id)?.name || '?'
  }
  const team1 = `${playerName(scheduleRow.team1_p1)} & ${playerName(scheduleRow.team1_p2)}`
  const team2 = `${playerName(scheduleRow.team2_p1)} & ${playerName(scheduleRow.team2_p2)}`

  const matchPlayerIds = [scheduleRow.team1_p1, scheduleRow.team1_p2, scheduleRow.team2_p1, scheduleRow.team2_p2]

  const handleSave = async () => {
    if (s1 === '' || s2 === '' || saving) return
    setSaving(true)
    setError(null)

    const winner = n1 > n2 ? 1 : n2 > n1 ? 2 : null
    const norm1 = winner === 1 ? 1.0 : winner === 2 ? 0.0 : 0.5
    const norm2 = winner === 2 ? 1.0 : winner === 1 ? 0.0 : 0.5

    try {
      const { data: match, error: mErr } = await supabase.from('matches').insert({
        session_id: session.id,
        round_number: scheduleRow.round_number,
        team1_p1: scheduleRow.team1_p1,
        team1_p2: scheduleRow.team1_p2,
        team2_p1: scheduleRow.team2_p1,
        team2_p2: scheduleRow.team2_p2,
        score_team1: n1,
        score_team2: n2,
        winner,
        normalized_score_team1: norm1,
        normalized_score_team2: norm2,
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

  const playerObj = (id) => players.find((p) => p.id === id)

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="flex gap-1 justify-center">
            <PlayerAvatar player={playerObj(scheduleRow.team1_p1)} size={28} />
            <PlayerAvatar player={playerObj(scheduleRow.team1_p2)} size={28} />
          </div>
          <span className="text-center font-semibold text-sm leading-tight text-gray-800">{team1}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            min="0"
            value={s1}
            onChange={(e) => setS1(e.target.value)}
            placeholder="0"
            className="score-input"
          />
          <span className="text-gray-400 font-bold text-xl px-0.5">–</span>
          <input
            type="number"
            min="0"
            value={s2}
            onChange={(e) => setS2(e.target.value)}
            placeholder="0"
            className="score-input"
          />
        </div>
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="flex gap-1 justify-center">
            <PlayerAvatar player={playerObj(scheduleRow.team2_p1)} size={28} />
            <PlayerAvatar player={playerObj(scheduleRow.team2_p2)} size={28} />
          </div>
          <span className="text-center font-semibold text-sm leading-tight text-gray-800">{team2}</span>
        </div>
      </div>

      {showWarn && (
        <p className="text-amber-500 text-xs text-center mt-2">
          Som is {n1 + n2}, verwacht {session.points_per_match}
        </p>
      )}
      {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}

      <PopperSection
        playerIds={matchPlayerIds}
        players={players}
        nicknames={nicknames}
        counts={poppers}
        onChange={setPoppers}
      />

      <button
        onClick={handleSave}
        disabled={s1 === '' || s2 === '' || saving}
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
