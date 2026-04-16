import { useState } from 'react'

export default function ScheduleView({ schedule, players, currentRound }) {
  const [open, setOpen] = useState(false)

  const name = (id) => players.find((p) => p.id === id)?.name ?? '?'

  // Group schedule rows by round
  const byRound = schedule.reduce((acc, row) => {
    if (!acc[row.round_number]) acc[row.round_number] = []
    acc[row.round_number].push(row)
    return acc
  }, {})

  const roundNumbers = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className="card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-sm font-semibold text-gray-700"
      >
        <span>Volledig schema</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {roundNumbers.map((roundNum) => {
            const rows = byRound[roundNum]
            const isCurrent = roundNum === currentRound
            const isCompleted = rows.every((r) => r.is_completed)

            return (
              <div
                key={roundNum}
                className={`rounded-xl p-3 border ${
                  isCurrent
                    ? 'border-primary bg-orange-50'
                    : isCompleted
                    ? 'border-green-100 bg-green-50'
                    : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isCurrent
                        ? 'text-primary'
                        : isCompleted
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }`}
                  >
                    Ronde {roundNum}
                  </span>
                  {isCompleted && <span className="text-green-500 text-xs">✓</span>}
                  {isCurrent && (
                    <span className="text-xs text-primary font-medium">← bezig</span>
                  )}
                </div>

                {rows.map((row) => (
                  <div key={row.id} className="text-sm text-gray-700 mb-1 last:mb-0">
                    <span className="text-gray-400 text-xs mr-1">Baan {row.court_number}:</span>
                    {name(row.team1_p1)} & {name(row.team1_p2)}
                    <span className="text-gray-400 mx-1">vs</span>
                    {name(row.team2_p1)} & {name(row.team2_p2)}
                    {row.is_completed && row.score_team1 !== null && (
                      <span className="ml-2 font-mono text-xs text-gray-400">
                        ({row.score_team1}–{row.score_team2})
                      </span>
                    )}
                    {row.warning && (
                      <span className="ml-1 text-xs text-amber-600">{row.warning}</span>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
