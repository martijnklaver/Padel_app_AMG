import { useState } from 'react'
import { supabase } from '../../supabaseClient'

function ScoreRow({ row, session, players, onSaved }) {
  const isPoints = session.score_mode === 'points'
  const [s1, setS1] = useState('')
  const [s2, setS2] = useState('')
  const [winner, setWinner] = useState(null)
  const [saving, setSaving] = useState(false)

  const playerName = (id) => players.find((p) => p.id === id)?.name ?? '?'
  const t1 = `${playerName(row.team1_p1)} & ${playerName(row.team1_p2)}`
  const t2 = `${playerName(row.team2_p1)} & ${playerName(row.team2_p2)}`

  const canSave = isPoints ? (s1 !== '' && s2 !== '') : winner !== null

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)

    const n1 = isPoints ? (parseInt(s1) || 0) : (winner === 1 ? 1 : 0)
    const n2 = isPoints ? (parseInt(s2) || 0) : (winner === 2 ? 1 : 0)
    const w = isPoints ? (n1 > n2 ? 1 : n2 > n1 ? 2 : 1) : winner

    const { error: mErr } = await supabase.from('matches').insert({
      session_id: session.id,
      round_number: row.round_number,
      team1_p1: row.team1_p1, team1_p2: row.team1_p2,
      team2_p1: row.team2_p1, team2_p2: row.team2_p2,
      score_team1: n1, score_team2: n2,
      winner: w,
      normalized_score_team1: w === 1 ? 1.0 : 0.0,
      normalized_score_team2: w === 2 ? 1.0 : 0.0,
      is_completed: true,
    })

    if (!mErr) {
      await supabase.from('schedule').update({ is_completed: true }).eq('id', row.id)
      onSaved()
    }
    setSaving(false)
  }

  if (isPoints) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <span className="flex-1 text-right text-xs font-medium text-gray-600 leading-tight">{t1}</span>
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number" min="0" value={s1} onChange={(e) => setS1(e.target.value)}
            placeholder="0"
            className="w-10 h-8 text-sm font-bold text-center border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            style={{ MozAppearance: 'textfield', appearance: 'textfield' }}
          />
          <span className="text-gray-300 text-xs">–</span>
          <input
            type="number" min="0" value={s2} onChange={(e) => setS2(e.target.value)}
            placeholder="0"
            className="w-10 h-8 text-sm font-bold text-center border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            style={{ MozAppearance: 'textfield', appearance: 'textfield' }}
          />
        </div>
        <span className="flex-1 text-xs font-medium text-gray-600 leading-tight">{t2}</span>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="shrink-0 text-xs text-white bg-primary rounded-lg px-2 py-1.5 hover:bg-primary-hover disabled:opacity-40"
        >
          {saving ? '...' : 'Opslaan'}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-2">
        <button
          onClick={() => setWinner(1)}
          className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-colors ${
            winner === 1 ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary/40'
          }`}
        >
          {t1}
        </button>
        <button
          onClick={() => setWinner(2)}
          className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-colors ${
            winner === 2 ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary/40'
          }`}
        >
          {t2}
        </button>
      </div>
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className="w-full text-xs text-white bg-primary rounded-lg py-1.5 hover:bg-primary-hover disabled:opacity-40"
      >
        {saving ? 'Opslaan...' : 'Opslaan'}
      </button>
    </div>
  )
}

export default function ScheduleAccordion({ schedule, matches, players, session, onScoreSaved, onEdit }) {
  const [open, setOpen] = useState(false)

  const playerName = (id) => players.find((p) => p.id === id)?.name ?? '?'
  const rounds = [...new Set(schedule.map((r) => r.round_number))].sort((a, b) => a - b)

  const findMatch = (row) =>
    matches.find(
      (m) =>
        m.is_completed &&
        m.session_id === session.id &&
        m.round_number === row.round_number &&
        ((m.team1_p1 === row.team1_p1 && m.team1_p2 === row.team1_p2) ||
          (m.team1_p1 === row.team1_p2 && m.team1_p2 === row.team1_p1))
    )

  const scoreStr = (m) => {
    if (!m) return null
    if (session.score_mode === 'games') return m.winner === 1 ? '1 – 0' : '0 – 1'
    return `${m.score_team1} – ${m.score_team2}`
  }

  return (
    <div className="card mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-sm font-semibold text-gray-700"
      >
        <span>Volledig schema</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {rounds.map((roundNum) => {
            const rows = schedule.filter((r) => r.round_number === roundNum)
            const isCurrent = rows.some((r) => r.is_current)
            const isDone = rows.every((r) => r.is_completed)

            const borderCls = isDone
              ? 'border-green-200'
              : isCurrent
              ? 'border-primary/40'
              : 'border-gray-100'
            const bgCls = isDone ? 'bg-green-50' : isCurrent ? 'bg-primary/5' : 'bg-gray-50'

            return (
              <div key={roundNum} className={`rounded-lg p-3 border ${borderCls} ${bgCls}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-500">Ronde {roundNum}</span>
                  {isDone && <span className="text-xs text-green-600 font-medium">✓ Gespeeld</span>}
                  {isCurrent && !isDone && <span className="text-xs text-primary font-medium">← Bezig</span>}
                </div>

                {rows.map((row) => {
                  const match = findMatch(row)
                  const done = row.is_completed && match

                  return (
                    <div key={row.id}>
                      {done ? (
                        <div className="text-xs text-gray-700 flex items-center justify-between">
                          <span>
                            <span className={match.winner === 1 ? 'font-semibold' : ''}>
                              {playerName(row.team1_p1)} & {playerName(row.team1_p2)}
                            </span>
                            <span className="text-gray-300 mx-1">vs</span>
                            <span className={match.winner === 2 ? 'font-semibold' : ''}>
                              {playerName(row.team2_p1)} & {playerName(row.team2_p2)}
                            </span>
                          </span>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <span className="font-semibold text-gray-600">{scoreStr(match)}</span>
                            {onEdit && (
                              <button
                                onClick={() => onEdit(match, row)}
                                className="text-gray-400 hover:text-primary ml-1"
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <ScoreRow
                          row={row}
                          session={session}
                          players={players}
                          onSaved={onScoreSaved}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
