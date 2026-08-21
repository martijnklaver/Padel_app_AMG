import { computeRankingFromMatches } from '../../utils/tournament'
import { computeCurrentSessionStreaks } from '../../utils/achievements'
import PlayerAvatar from '../shared/PlayerAvatar'

function streakLabel(streak) {
  if (streak >= 5) return 'UNSTOPPABLE'
  if (streak >= 3) return 'ON FIRE'
  return 'HOT'
}

export default function HomeHero({ players, sessions, matches }) {
  const completedSessions = sessions.filter((s) => s.is_completed)
  if (completedSessions.length === 0) return null

  const leader = computeRankingFromMatches(players, matches).filter((p) => p.played > 0)[0]
  if (!leader) return null

  const streaks = computeCurrentSessionStreaks(players, sessions, matches)
  const hottest = streaks.find((s) => s.streak >= 2)
  const hottestPlayer = hottest ? players.find((p) => p.id === hottest.player_id) : null

  return (
    <div className="bg-primary/10 rounded-2xl p-4 mb-6 space-y-2">
      <div className="flex items-center gap-2.5">
        <PlayerAvatar player={leader} size={32} />
        <p className="text-sm text-gray-800 min-w-0 truncate">
          👑 <span className="font-semibold">{leader.name}</span> leidt met {leader.winPct}%
        </p>
      </div>
      {hottestPlayer && (
        <div className="flex items-center gap-2.5">
          <PlayerAvatar player={hottestPlayer} size={32} />
          <p className="text-sm text-gray-800 min-w-0 truncate">
            🔥 <span className="font-semibold">{hottestPlayer.name}</span> — {streakLabel(hottest.streak)}
          </p>
        </div>
      )}
      <p className="text-xs text-gray-500">🎾 {completedSessions.length} sessies gespeeld</p>
    </div>
  )
}
