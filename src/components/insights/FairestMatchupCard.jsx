import { computeFairestMatchup } from '../../utils/tournament'

export default function FairestMatchupCard({ players, matches }) {
  const matchups = computeFairestMatchup(players, matches)

  if (matchups.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-2">Eerlijkste teamindeling</h3>
        <p className="text-gray-400 text-sm">Nog geen data</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-700 mb-1">Eerlijkste teamindeling</h3>
      <p className="text-xs text-gray-400 mb-3">Kleinste gemiddeld puntenverschil</p>
      <div className="space-y-2">
        {matchups.slice(0, 5).map((m, i) => (
          <div
            key={m.team1Ids.join('-') + '|' + m.team2Ids.join('-')}
            className={`flex items-center justify-between gap-2 py-2 ${
              i < matchups.length - 1 ? 'border-b border-gray-50' : ''
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs flex-wrap min-w-0">
              <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium whitespace-nowrap">
                {m.team1Names.join(' & ')}
              </span>
              <span className="text-gray-300">vs</span>
              <span className="px-2 py-1 rounded-lg bg-orange-50 text-orange-700 font-medium whitespace-nowrap">
                {m.team2Names.join(' & ')}
              </span>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div className="font-semibold text-sm text-green-600">
                Δ{m.avgDiff}
              </div>
              <div className="text-gray-400 text-xs">{m.played}×</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
