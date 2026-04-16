export default function MatchHistory({ matches, players }) {
  const completed = [...matches]
    .filter((m) => m.is_completed)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  if (completed.length === 0) return null

  const playerName = (id) => players.find((p) => p.id === id)?.name ?? '?'

  return (
    <div className="card">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Gespeelde wedstrijden
      </h2>
      <div className="space-y-2">
        {completed.map((m) => {
          const t1won = m.score_team1 > m.score_team2
          const t2won = m.score_team2 > m.score_team1

          return (
            <div
              key={m.id}
              className="flex items-center justify-between text-sm py-2
                         border-b border-gray-50 last:border-0"
            >
              <div className={`flex-1 text-right ${t1won ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                <span>{playerName(m.team1_p1)}</span>
                <span className="mx-1 text-gray-300">&</span>
                <span>{playerName(m.team1_p2)}</span>
              </div>

              <div className="mx-3 flex items-center gap-1 font-mono font-bold text-base">
                <span
                  className={`px-2 py-0.5 rounded ${
                    t1won ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {m.score_team1}
                </span>
                <span className="text-gray-300 text-xs">–</span>
                <span
                  className={`px-2 py-0.5 rounded ${
                    t2won ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {m.score_team2}
                </span>
              </div>

              <div className={`flex-1 ${t2won ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                <span>{playerName(m.team2_p1)}</span>
                <span className="mx-1 text-gray-300">&</span>
                <span>{playerName(m.team2_p2)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
