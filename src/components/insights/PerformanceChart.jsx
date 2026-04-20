import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value}% ({entry.payload[`${entry.dataKey}_detail`]})
        </p>
      ))}
    </div>
  )
}

export default function PerformanceChart({ players, sessions, matches }) {
  const [activePlayers, setActivePlayers] = useState(() => new Set(players.map((p) => p.id)))

  const chartSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date))

  const chartData = chartSessions.map((session) => {
    const sessionMatches = matches.filter((m) => m.session_id === session.id && m.is_completed)
    const point = {
      date: new Date(session.date + 'T12:00:00').toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'short',
      }),
    }
    players.forEach((player) => {
      if (!session.player_ids.includes(player.id)) return
      const pm = sessionMatches.filter((m) =>
        [m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2].includes(player.id)
      )
      if (pm.length === 0) return
      const wins = pm.reduce((sum, m) => {
        const onTeam1 = [m.team1_p1, m.team1_p2].includes(player.id)
        return sum + (onTeam1 ? m.normalized_score_team1 : m.normalized_score_team2)
      }, 0)
      const winPct = parseFloat(((wins / pm.length) * 100).toFixed(1))
      point[player.id] = winPct
      point[`${player.id}_detail`] = `${Math.round(wins)}/${pm.length}`
    })
    return point
  })

  const togglePlayer = (id) => {
    setActivePlayers((prev) => {
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

  if (chartSessions.length < 2) {
    return (
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-2">Prestatiegrafiek</h3>
        <p className="text-gray-400 text-sm">Minimaal 2 sessies nodig</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-700 mb-3">Prestatiegrafiek</h3>

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

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          {players.map((player, i) =>
            activePlayers.has(player.id) ? (
              <Line
                key={player.id}
                type="monotone"
                dataKey={player.id}
                name={player.name}
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
    </div>
  )
}
