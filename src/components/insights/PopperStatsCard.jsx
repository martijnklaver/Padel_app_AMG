import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import PlayerAvatar from '../shared/PlayerAvatar'

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6']

export default function PopperStatsCard({ players, sessions, matches, poppers }) {
  const [activePlayers, setActivePlayers] = useState(() => new Set(players.map(p => p.id)))

  if (poppers.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-2">Popper statistieken</h3>
        <p className="text-gray-400 text-sm">Nog geen poppers geregistreerd</p>
      </div>
    )
  }

  // 1. Overall ranking
  const matchesPlayed = {}
  matches.forEach(m => {
    [m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2].forEach(id => {
      matchesPlayed[id] = (matchesPlayed[id] || 0) + 1
    })
  })

  const popperTotals = {}
  poppers.forEach(p => {
    popperTotals[p.player_id] = (popperTotals[p.player_id] || 0) + p.count
  })

  const overallRanking = players
    .map(p => ({
      ...p,
      total: popperTotals[p.id] || 0,
      avg: matchesPlayed[p.id]
        ? ((popperTotals[p.id] || 0) / matchesPlayed[p.id]).toFixed(1)
        : '0.0',
    }))
    .filter(p => p.total > 0)
    .sort((a, b) => b.total - a.total)

  // 2. Per-opponent breakdown
  const opponentCountsByPlayer = {}
  poppers.forEach(p => {
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

  // 3. Chart data — poppers per player per session
  const sessionPopperMap = {}
  poppers.forEach(p => {
    if (!sessionPopperMap[p.session_id]) sessionPopperMap[p.session_id] = {}
    sessionPopperMap[p.session_id][p.player_id] =
      (sessionPopperMap[p.session_id][p.player_id] || 0) + p.count
  })

  const sortedSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date))
  const chartData = sortedSessions.map(session => {
    const point = {
      date: new Date(session.date + 'T12:00:00').toLocaleDateString('nl-NL', {
        day: 'numeric', month: 'short',
      }),
    }
    players.forEach(player => {
      if (session.player_ids?.includes(player.id)) {
        const val = sessionPopperMap[session.id]?.[player.id]
        if (val !== undefined) point[player.id] = val
      }
    })
    return point
  })

  const hasChartData = sortedSessions.length >= 2 && Object.keys(sessionPopperMap).length > 0

  const togglePlayer = (id) => {
    setActivePlayers(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size === 1) return prev
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Overall ranking */}
      {overallRanking.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">Meeste poppers overall</h3>

          {/* Poppermeister banner */}
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
            <PlayerAvatar player={overallRanking[0]} size={40} />
            <div>
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">🏆 Poppermeister</p>
              <p className="font-bold text-gray-900 text-sm">{overallRanking[0].name}</p>
              <p className="text-xs text-gray-500">{overallRanking[0].total} poppers · {overallRanking[0].avg} per potje</p>
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
        </div>
      )}

      {/* Per-opponent breakdown */}
      {perOpponentRows.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">Popper verdeling per tegenstander</h3>
          <div className="space-y-2.5">
            {perOpponentRows.map(({ player, topOpp, count }) => (
              <div key={player.id} className="flex items-center gap-2 text-sm flex-wrap">
                <PlayerAvatar player={player} size={24} />
                <span className="font-medium text-gray-800">{player.name}</span>
                <span className="text-gray-400 text-xs">→ meeste vs</span>
                <PlayerAvatar player={topOpp} size={20} />
                <span className="text-gray-700">{topOpp?.name}</span>
                <span className="ml-auto text-xs font-semibold text-gray-500 tabular-nums">{count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3">Popper grafiek</h3>
        {!hasChartData ? (
          <p className="text-gray-400 text-sm">Minimaal 2 sessies met poppers nodig</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {players.map((player, i) => {
                const active = activePlayers.has(player.id)
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium border transition-all"
                    style={
                      active
                        ? { backgroundColor: COLORS[i % COLORS.length], color: '#fff', borderColor: COLORS[i % COLORS.length] }
                        : { backgroundColor: '#f3f4f6', color: '#9ca3af', borderColor: '#e5e7eb' }
                    }
                  >
                    {player.name}
                  </button>
                )
              })}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value, dataKey) => [value, players.find(p => p.id === dataKey)?.name ?? dataKey]}
                  labelStyle={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}
                />
                {players.map((player, i) =>
                  activePlayers.has(player.id) ? (
                    <Line
                      key={player.id}
                      type="monotone"
                      dataKey={player.id}
                      name={player.id}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                    />
                  ) : null
                )}
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  )
}
