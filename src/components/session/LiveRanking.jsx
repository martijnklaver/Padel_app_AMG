import { computeSessionRanking, assignPositions } from '../../utils/tournament'

export default function LiveRanking({ session, players, matches, nicknames }) {
  const isPoints = session.score_mode === 'points'
  const ranking = assignPositions(
    computeSessionRanking(session, players, matches),
    (p) => isPoints ? p.pct : p.winPct
  )

  return (
    <div className="card mt-3">
      <h3 className="font-semibold text-gray-700 mb-3 text-sm">Tussenstand</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-100">
            <th className="text-left pb-2 font-medium">#</th>
            <th className="text-left pb-2 font-medium">Naam</th>
            {isPoints ? (
              <>
                <th className="text-right pb-2 font-medium">Pnt. gew.</th>
                <th className="text-right pb-2 font-medium">Pnt. gesp.</th>
                <th className="text-right pb-2 font-medium">%</th>
              </>
            ) : (
              <>
                <th className="text-right pb-2 font-medium">Gew.</th>
                <th className="text-right pb-2 font-medium">Gesp.</th>
                <th className="text-right pb-2 font-medium">Win%</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {ranking.map((p) => {
            const pct = isPoints ? p.pct : p.winPct
            const val1 = isPoints ? p.pointsWon : p.wins
            const val2 = isPoints ? p.pointsPlayed : p.played
            const noData = isPoints ? p.pointsPlayed === 0 : p.played === 0
            return (
              <tr
                key={p.id}
                className={p.position === 1 && !noData ? 'bg-orange-50 font-semibold text-primary' : 'text-gray-700'}
              >
                <td className="py-1.5">{noData ? p.position : (p.medal ?? p.position)}</td>
                <td className="py-1.5">{nicknames?.[p.id]?.trim() || p.name}</td>
                <td className="text-right py-1.5">{noData ? '–' : val1}</td>
                <td className="text-right py-1.5">{noData ? '–' : val2}</td>
                <td className="text-right py-1.5">{pct !== null ? `${pct}%` : '–'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
