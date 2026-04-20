import { computeSessionRanking } from '../../utils/tournament'

export default function LiveRanking({ session, players, matches }) {
  const ranking = computeSessionRanking(session, players, matches)
  const isPoints = session.score_mode === 'points'

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
        <tbody>
          {ranking.map((p, i) => {
            const pct = isPoints ? p.pct : p.winPct
            const val1 = isPoints ? p.pointsWon : p.wins
            const val2 = isPoints ? p.pointsPlayed : p.played
            const noData = isPoints ? p.pointsPlayed === 0 : p.played === 0
            return (
              <tr
                key={p.id}
                className={i === 0 && !noData ? 'font-semibold text-primary' : 'text-gray-700'}
              >
                <td className="py-1.5">{i + 1}</td>
                <td className="py-1.5">{p.name}</td>
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
