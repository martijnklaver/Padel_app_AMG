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
            className={`flex items-center justify-between py-2 text-sm ${
              i < matchups.length - 1 ? 'border-b border-gray-50' : ''
            }`}
          >
            <div className="text-gray-700 text-xs">
              <span className={i === 0 ? 'font-semibold text-primary' : ''}>
                {m.team1Names.join(' & ')}
              </span>
              <span className="text-gray-300 mx-1">vs</span>
              <span className={i === 0 ? 'font-semibold text-primary' : ''}>
                {m.team2Names.join(' & ')}
              </span>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div className={`font-semibold text-sm ${i === 0 ? 'text-primary' : 'text-gray-700'}`}>
                Δ {m.avgDiff}
              </div>
              <div className="text-gray-400 text-xs">{m.played}×</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
