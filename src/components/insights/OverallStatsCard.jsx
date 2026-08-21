import { computeRankingFromMatches, computePointsRankingFromMatches, assignPositions } from '../../utils/tournament'
import PlayerAvatar from '../shared/PlayerAvatar'

export default function OverallStatsCard({ players, matches, scoreModeFilter }) {
  const isPoints = scoreModeFilter === 'points'

  if (isPoints) {
    const ranking = assignPositions(
      computePointsRankingFromMatches(players, matches).filter((p) => p.pointsPlayed > 0),
      (p) => p.pct
    )

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
              <th className="text-left pb-2 font-medium">#</th>
              <th className="text-left pb-2 font-medium">Naam</th>
              <th className="text-right pb-2 font-medium">Punten gew.</th>
              <th className="text-right pb-2 font-medium">Punten gesp.</th>
              <th className="text-right pb-2 font-medium">Win% (punten)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ranking.map((p) => (
              <tr key={p.id} className={p.position === 1 ? 'bg-orange-50 font-bold text-primary' : 'text-gray-700'}>
                <td className="py-2">{p.medal ?? p.position}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar player={p} size={22} />
                    <span>{p.name}</span>
                  </div>
                </td>
                <td className="text-right py-2">{p.pointsWon}</td>
                <td className="text-right py-2">{p.pointsPlayed}</td>
                <td className="text-right py-2">{p.pct !== null ? `${p.pct}%` : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const ranking = assignPositions(
    computeRankingFromMatches(players, matches).filter((p) => p.played > 0),
    (p) => p.winPct
  )

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
            <th className="text-left pb-2 font-medium">#</th>
            <th className="text-left pb-2 font-medium">Naam</th>
            <th className="text-right pb-2 font-medium">Gesp.</th>
            <th className="text-right pb-2 font-medium">Gew.</th>
            <th className="text-right pb-2 font-medium">Verl.</th>
            <th className="text-right pb-2 font-medium">Win% (potjes)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {ranking.map((p) => {
            const losses = p.played - Math.round(p.wins)
            return (
              <tr key={p.id} className={p.position === 1 ? 'bg-orange-50 font-bold text-primary' : 'text-gray-700'}>
                <td className="py-2">{p.medal ?? p.position}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar player={p} size={22} />
                    <span>{p.name}</span>
                  </div>
                </td>
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
