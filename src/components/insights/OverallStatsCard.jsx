import { computeRankingFromMatches, computePointsRankingFromMatches, assignPositions } from '../../utils/tournament'
import PlayerAvatar from '../shared/PlayerAvatar'

// Vergelijkt de win%/punten% van iemands laatst gespeelde sessie met hun
// carrièregemiddelde — puur voor een klein trendpijltje, geen opgeslagen data.
function computeTrend(playerId, sessions, matches, isPoints) {
  const playerSessions = sessions
    .filter((s) => s.player_ids?.includes(playerId))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || (a.created_at ?? '').localeCompare(b.created_at ?? ''))

  if (playerSessions.length === 0) return null

  const lastSession = playerSessions[playerSessions.length - 1]
  const lastSessionMatches = matches.filter(
    (m) => m.session_id === lastSession.id && [m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2].includes(playerId)
  )
  if (lastSessionMatches.length === 0) return null

  const pctFor = (ms) => {
    if (isPoints) {
      let won = 0
      let total = 0
      ms.forEach((m) => {
        const onTeam1 = [m.team1_p1, m.team1_p2].includes(playerId)
        won += onTeam1 ? (m.score_team1 ?? 0) : (m.score_team2 ?? 0)
        total += (m.score_team1 ?? 0) + (m.score_team2 ?? 0)
      })
      return total > 0 ? (won / total) * 100 : null
    }
    let wins = 0
    ms.forEach((m) => {
      const onTeam1 = [m.team1_p1, m.team1_p2].includes(playerId)
      wins += onTeam1 ? m.normalized_score_team1 : m.normalized_score_team2
    })
    return ms.length > 0 ? (wins / ms.length) * 100 : null
  }

  const allPlayerMatches = matches.filter((m) =>
    [m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2].includes(playerId)
  )
  const lastPct = pctFor(lastSessionMatches)
  const overallPct = pctFor(allPlayerMatches)
  if (lastPct === null || overallPct === null) return null

  if (lastPct > overallPct) return 'up'
  if (lastPct < overallPct) return 'down'
  return null
}

function TrendArrow({ trend }) {
  if (trend === 'up') return <span className="text-green-500 text-xs ml-1" title="Laatste sessie beter dan gemiddeld">↑</span>
  if (trend === 'down') return <span className="text-red-500 text-xs ml-1" title="Laatste sessie slechter dan gemiddeld">↓</span>
  return null
}

export default function OverallStatsCard({ players, matches, sessions = [], scoreModeFilter }) {
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
            {ranking.map((p) => {
              const trend = computeTrend(p.id, sessions, matches, true)
              return (
                <tr key={p.id} className={p.position === 1 ? 'bg-orange-50 font-bold text-primary' : 'text-gray-700'}>
                  <td className="py-2">{p.medal ?? p.position}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <PlayerAvatar player={p} size={22} />
                      <span>{p.name}</span>
                      <TrendArrow trend={trend} />
                    </div>
                  </td>
                  <td className="text-right py-2">{p.pointsWon}</td>
                  <td className="text-right py-2">{p.pointsPlayed}</td>
                  <td className="text-right py-2">{p.pct !== null ? `${p.pct}%` : '–'}</td>
                </tr>
              )
            })}
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
            const trend = computeTrend(p.id, sessions, matches, false)
            return (
              <tr key={p.id} className={p.position === 1 ? 'bg-orange-50 font-bold text-primary' : 'text-gray-700'}>
                <td className="py-2">{p.medal ?? p.position}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar player={p} size={22} />
                    <span>{p.name}</span>
                    <TrendArrow trend={trend} />
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
