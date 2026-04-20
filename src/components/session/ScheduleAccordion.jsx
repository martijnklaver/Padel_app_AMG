import { useState } from 'react'

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
    if (!m || !m.is_completed) return null
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

            return (
              <div
                key={roundNum}
                className={`rounded-lg p-3 border ${
                  isCurrent
                    ? 'border-primary/40 bg-primary/5'
                    : isDone
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-500">Ronde {roundNum}</span>
                  {isCurrent && (
                    <span className="text-xs text-primary font-medium">← bezig</span>
                  )}
                  {isDone && !isCurrent && (
                    <span className="text-xs text-green-600">✓</span>
                  )}
                </div>
                {rows.map((row) => {
                  const match = findMatch(row)
                  const score = scoreStr(match)
                  return (
                    <div key={row.id} className="text-xs text-gray-700 flex items-center justify-between">
                      <span>
                        {playerName(row.team1_p1)} & {playerName(row.team1_p2)}
                        <span className="text-gray-300 mx-1">vs</span>
                        {playerName(row.team2_p1)} & {playerName(row.team2_p2)}
                      </span>
                      {score && (
                        <span className="font-semibold text-gray-600 ml-2 shrink-0">{score}</span>
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
