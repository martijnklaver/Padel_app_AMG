import { useState } from 'react'
import { supabase } from '../../supabaseClient'

function PreScoreRow({ row, session, players, draft }) {
  const isPoints = session.score_mode === 'points'
  const [s1, setS1] = useState(draft?.score_team1 != null ? String(draft.score_team1) : '')
  const [s2, setS2] = useState(draft?.score_team2 != null ? String(draft.score_team2) : '')
  const [winner, setWinner] = useState(draft?.winner ?? null)
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
    const w = isPoints ? (n1 >= n2 ? 1 : 2) : winner
    const norm1 = w === 1 ? 1.0 : 0.0
    const norm2 = w === 2 ? 1.0 : 0.0

    const matchData = {
      session_id: session.id,
      round_number: row.round_number,
      team1_p1: row.team1_p1, team1_p2: row.team1_p2,
      team2_p1: row.team2_p1, team2_p2: row.team2_p2,
      score_team1: n1, score_team2: n2,
      winner: w,
      normalized_score_team1: norm1,
      normalized_score_team2: norm2,
      is_completed: false,
    }

    if (draft) {
      await supabase.from('matches').update(matchData).eq('id', draft.id)
    } else {
      await supabase.from('matches').insert(matchData)
    }
    setSaving(false)
  }

  if (isPoints) {
    return (
      <div className="mt-2">
        <div className="flex items-center gap-2 text-xs mb-1">
          <span className="flex-1 text-right font-medium text-gray-600">{t1}</span>
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number" min="0" value={s1} onChange={(e) => setS1(e.target.value)}
              placeholder="0"
              className="w-10 h-8 text-sm font-bold text-center border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              style={{ MozAppearance: 'textfield', appearance: 'textfield' }}
            />
            <span className="text-gray-300">–</span>
            <input
              type="number" min="0" value={s2} onChange={(e) => setS2(e.target.value)}
              placeholder="0"
              className="w-10 h-8 text-sm font-bold text-center border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              style={{ MozAppearance: 'textfield', appearance: 'textfield' }}
            />
          </div>
          <span className="flex-1 font-medium text-gray-600">{t2}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="text-xs text-blue-600 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50 disabled:opacity-40 w-full mt-1"
        >
          {saving ? 'Opslaan...' : 'Score vooraf opslaan'}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={() => setWinner(1)}
        className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-colors ${
          winner === 1 ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-200 text-gray-600 hover:border-blue-300'
        }`}
      >
        {t1} wint
      </button>
      <button
        onClick={() => setWinner(2)}
        className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-colors ${
          winner === 2 ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-200 text-gray-600 hover:border-blue-300'
        }`}
      >
        {t2} wint
      </button>
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className="text-xs text-blue-600 border border-blue-200 rounded-lg px-2 py-1.5 hover:bg-blue-50 disabled:opacity-40 shrink-0"
      >
        {saving ? '...' : 'Opslaan'}
      </button>
    </div>
  )
}

export default function ScheduleAccordion({ schedule, matches, players, session }) {
  const [open, setOpen] = useState(false)

  const playerName = (id) => players.find((p) => p.id === id)?.name ?? '?'
  const rounds = [...new Set(schedule.map((r) => r.round_number))].sort((a, b) => a - b)

  const findMatch = (row) =>
    matches.find(
      (m) =>
        m.session_id === session.id &&
        m.round_number === row.round_number &&
        ((m.team1_p1 === row.team1_p1 && m.team1_p2 === row.team1_p2) ||
          (m.team1_p1 === row.team1_p2 && m.team1_p2 === row.team1_p1))
    )

  const scoreStr = (m) => {
    if (!m?.is_completed) return null
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
            const isFuture = !isCurrent && !isDone

            // Check of er een draft (vooraf ingevulde) score is
            const hasDraft = isFuture && rows.some((r) => {
              const m = findMatch(r)
              return m && !m.is_completed
            })

            let borderCls, bgCls, labelEl
            if (isDone) {
              borderCls = 'border-green-200'; bgCls = 'bg-green-50'
              labelEl = <span className="text-xs text-green-600 font-medium">✓ Gespeeld</span>
            } else if (isCurrent) {
              borderCls = 'border-primary/40'; bgCls = 'bg-primary/5'
              labelEl = <span className="text-xs text-primary font-medium">← Bezig</span>
            } else if (hasDraft) {
              borderCls = 'border-blue-200'; bgCls = 'bg-blue-50'
              labelEl = <span className="text-xs text-blue-500 font-medium">✎ Vooraf ingevuld</span>
            } else {
              borderCls = 'border-gray-100'; bgCls = 'bg-gray-50'
              labelEl = null
            }

            return (
              <div key={roundNum} className={`rounded-lg p-3 border ${borderCls} ${bgCls}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-500">Ronde {roundNum}</span>
                  {labelEl}
                </div>

                {rows.map((row) => {
                  const match = findMatch(row)
                  const score = scoreStr(match)
                  const isDraft = match && !match.is_completed

                  return (
                    <div key={row.id}>
                      <div className="text-xs text-gray-700 flex items-center justify-between">
                        <span>
                          {playerName(row.team1_p1)} & {playerName(row.team1_p2)}
                          <span className="text-gray-300 mx-1">vs</span>
                          {playerName(row.team2_p1)} & {playerName(row.team2_p2)}
                        </span>
                        {score ? (
                          <span className="font-semibold text-gray-600 ml-2 shrink-0">{score}</span>
                        ) : isDraft ? (
                          <span className="text-blue-400 text-xs ml-2 shrink-0 italic">
                            {session.score_mode === 'points'
                              ? `${match.score_team1}–${match.score_team2} (concept)`
                              : `Team ${match.winner} wint (concept)`}
                          </span>
                        ) : null}
                      </div>

                      {/* Pre-score invoer voor toekomstige wedstrijden */}
                      {isFuture && !isCurrent && (
                        <PreScoreRow
                          key={match?.id ?? row.id}
                          row={row}
                          session={session}
                          players={players}
                          draft={isDraft ? match : null}
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
