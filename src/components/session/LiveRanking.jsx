import { computeSessionRanking, assignPositions } from '../../utils/tournament'
import PlayerAvatar from '../shared/PlayerAvatar'

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
          <tr className="text-gray-400 border-b border-gray-200">
            <th className="text-left pb-2.5 font-medium w-8">#</th>
            <th className="text-left pb-2.5 font-medium">Naam</th>
            {isPoints ? (
              <>
                <th className="text-right pb-2.5 pl-4 font-medium whitespace-nowrap">Pnt. gew.</th>
                <th className="text-right pb-2.5 pl-4 font-medium whitespace-nowrap">Pnt. gesp.</th>
                <th className="text-right pb-2.5 pl-4 font-medium">%</th>
              </>
            ) : (
              <>
                <th className="text-right pb-2.5 pl-4 font-medium">Gew.</th>
                <th className="text-right pb-2.5 pl-4 font-medium">Gesp.</th>
                <th className="text-right pb-2.5 pl-4 font-medium">Win%</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {ranking.map((p) => {
            const pct = isPoints ? p.pct : p.winPct
            const val1 = isPoints ? p.pointsWon : p.wins
            const val2 = isPoints ? p.pointsPlayed : p.played
            const noData = isPoints ? p.pointsPlayed === 0 : p.played === 0
            return (
              <tr
                key={p.id}
                className={`border-b border-gray-100 last:border-b-0 ${p.position === 1 && !noData ? 'bg-orange-50 font-semibold text-primary' : 'text-gray-700'}`}
              >
                <td className="py-2.5 w-8">{noData ? p.position : (p.medal ?? p.position)}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-1.5">
                    <PlayerAvatar player={p} size={20} />
                    <span>{nicknames?.[p.id]?.trim() || p.name}</span>
                  </div>
                </td>
                <td className="text-right py-2.5 pl-4">{noData ? '–' : val1}</td>
                <td className="text-right py-2.5 pl-4">{noData ? '–' : val2}</td>
                <td className="text-right py-2.5 pl-4">{pct !== null ? `${pct}%` : '–'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
