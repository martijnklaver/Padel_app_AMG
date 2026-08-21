import { computeSessionRanking, assignPositions } from '../../utils/tournament'
import PlayerAvatar from '../shared/PlayerAvatar'

// Live streak binnen de huidige sessie — alleen potjes op rij gewonnen, in
// speelvolgorde (ronde). Gelijkspel telt niet mee (reset de streak niet, telt
// ook niet op). Alleen relevant tijdens een actieve sessie, niet opgeslagen.
function currentStreak(playerId, matches) {
  const playerMatches = matches
    .filter((m) => m.is_completed && [m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2].includes(playerId))
    .slice()
    .sort((a, b) => a.round_number - b.round_number)

  let streak = 0
  for (const m of playerMatches) {
    const onTeam1 = [m.team1_p1, m.team1_p2].includes(playerId)
    const score = onTeam1 ? m.normalized_score_team1 : m.normalized_score_team2
    if (score === 1.0) streak++
    else if (score === 0.0) streak = 0
  }
  return streak
}

function streakLabel(streak) {
  if (streak >= 5) return 'UNSTOPPABLE 🔥🔥🔥'
  if (streak >= 3) return 'ON FIRE 🔥🔥'
  if (streak === 2) return 'HOT 🔥'
  return null
}

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
            const streak = streakLabel(currentStreak(p.id, matches))
            return (
              <tr
                key={p.id}
                className={`border-b border-gray-100 last:border-b-0 ${p.position === 1 && !noData ? 'bg-orange-50 font-semibold text-primary' : 'text-gray-700'}`}
              >
                <td className="py-2.5 w-8">{noData ? p.position : (p.medal ?? p.position)}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <PlayerAvatar player={p} size={20} />
                    <span>{nicknames?.[p.id]?.trim() || p.name}</span>
                    {streak && (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {streak}
                      </span>
                    )}
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
