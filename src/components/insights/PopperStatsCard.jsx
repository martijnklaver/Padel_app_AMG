import PlayerAvatar from '../shared/PlayerAvatar'

const DATE_CUTOFF = '2026-08-03'

export default function PopperStatsCard({ players, sessions, matches, poppers }) {
  // Filter op sessies vanaf de cutoff datum
  const validSessionIds = new Set(
    sessions.filter(s => s.date >= DATE_CUTOFF).map(s => s.id)
  )
  const datePoppers = poppers.filter(p => validSessionIds.has(p.session_id))
  const dateMatches = matches.filter(m => validSessionIds.has(m.session_id))

  if (datePoppers.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-2">🎾 Popper stats</h3>
        <p className="text-gray-400 text-sm">Geen poppers in deze sessies</p>
      </div>
    )
  }

  // Potjes gespeeld per speler (alleen als hij/zij daadwerkelijk speelde)
  const matchesPlayed = {}
  dateMatches.forEach(m => {
    [m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2].forEach(id => {
      matchesPlayed[id] = (matchesPlayed[id] || 0) + 1
    })
  })

  // Totaal poppers per speler
  const popperTotals = {}
  datePoppers.forEach(p => {
    popperTotals[p.player_id] = (popperTotals[p.player_id] || 0) + p.count
  })

  // Overall ranking
  const overallRanking = players
    .map(p => ({
      ...p,
      total: popperTotals[p.id] || 0,
      avg: matchesPlayed[p.id]
        ? ((popperTotals[p.id] || 0) / matchesPlayed[p.id]).toFixed(1)
        : '–',
    }))
    .filter(p => p.total > 0)
    .sort((a, b) => b.total - a.total)

  // Per-opponent breakdown
  const opponentCountsByPlayer = {}
  datePoppers.forEach(p => {
    if (!opponentCountsByPlayer[p.player_id]) opponentCountsByPlayer[p.player_id] = {}
    ;(p.opponent_ids || []).forEach(oppId => {
      opponentCountsByPlayer[p.player_id][oppId] =
        (opponentCountsByPlayer[p.player_id][oppId] || 0) + p.count
    })
  })

  const perOpponentRows = players
    .map(p => {
      const oppMap = opponentCountsByPlayer[p.id]
      if (!oppMap || Object.keys(oppMap).length === 0) return null
      const topOppId = Object.keys(oppMap).reduce(
        (best, id) => oppMap[id] > (oppMap[best] || 0) ? id : best,
        Object.keys(oppMap)[0]
      )
      return {
        player: p,
        topOpp: players.find(o => o.id === topOppId),
        count: oppMap[topOppId],
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count)

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-700 mb-4">🎾 Popper stats</h3>

      {/* Onderdeel 1: Overall ranking */}
      {overallRanking.length > 0 && (
        <>
          {/* Poppermeister banner */}
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
            <PlayerAvatar player={overallRanking[0]} size={40} />
            <div>
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">🏆 Poppermeister</p>
              <p className="font-bold text-gray-900 text-sm">{overallRanking[0].name}</p>
              <p className="text-xs text-gray-500">
                {overallRanking[0].total} poppers · {overallRanking[0].avg} per potje
              </p>
            </div>
          </div>

          {overallRanking.length > 1 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-100">
                  <th className="text-left pb-2 font-medium w-6">#</th>
                  <th className="text-left pb-2 font-medium">Naam</th>
                  <th className="text-right pb-2 font-medium">Totaal</th>
                  <th className="text-right pb-2 font-medium whitespace-nowrap">Per potje</th>
                </tr>
              </thead>
              <tbody>
                {overallRanking.slice(1).map((p, i) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-b-0 text-gray-700">
                    <td className="py-2 text-xs">{i + 2}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <PlayerAvatar player={p} size={22} />
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-2">{p.total}</td>
                    <td className="text-right py-2">{p.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Scheiding */}
      {overallRanking.length > 0 && perOpponentRows.length > 0 && (
        <div className="border-t border-gray-100 my-4" />
      )}

      {/* Onderdeel 2: Per-opponent breakdown */}
      {perOpponentRows.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Meeste poppers tegen</p>
          <div className="space-y-2.5">
            {perOpponentRows.map(({ player, topOpp, count }) => (
              <div key={player.id} className="flex items-center gap-2 text-sm flex-wrap">
                <PlayerAvatar player={player} size={22} />
                <span className="font-medium text-gray-800">{player.name}</span>
                <span className="text-gray-400 text-xs">→ meeste vs</span>
                <PlayerAvatar player={topOpp} size={18} />
                <span className="text-gray-700">{topOpp?.name}</span>
                <span className="ml-auto text-xs font-semibold text-gray-500 tabular-nums">{count}×</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
