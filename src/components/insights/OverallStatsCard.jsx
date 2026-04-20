import { computeRankingFromMatches } from '../../utils/tournament'

export default function OverallStatsCard({ players, matches }) {
  const ranking = computeRankingFromMatches(players, matches).filter((p) => p.played > 0)

  if (ranking.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-2">Overall statistieken</h3>
        <p className="text-gray-400 text-sm">Nog geen data</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-700 mb-3">Overall statistieken</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs border-b border-gray-100">
            <th className="text-left pb-2 font-medium">Naam</th>
            <th className="text-right pb-2 font-medium">Gesp.</th>
            <th className="text-right pb-2 font-medium">Gew.</th>
            <th className="text-right pb-2 font-medium">Verl.</th>
            <th className="text-right pb-2 font-medium">Win%</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((p, i) => {
            const losses = p.played - Math.round(p.wins)
            return (
              <tr key={p.id} className={i === 0 ? 'font-bold text-primary' : 'text-gray-700'}>
                <td className="py-2">{p.name}</td>
                <td className="text-right py-2">{p.played}</td>
                <td className="text-right py-2">{Math.round(p.wins)}</td>
                <td className="text-right py-2">{losses}</td>
                <td className="text-right py-2">{p.winPct !== null ? `${p.winPct}%` : '–'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
