import { computeRankingFromMatches } from '../../utils/tournament'
import { computeCurrentSessionStreaks } from '../../utils/achievements'
import PlayerAvatar from '../shared/PlayerAvatar'

function streakInfo(streak) {
  if (streak >= 5) return { emoji: '🔥🔥🔥', label: 'UNSTOPPABLE', hint: '5+ sessies op rij gewonnen' }
  if (streak >= 3) return { emoji: '🔥🔥', label: 'ON FIRE', hint: '3-4 sessies op rij gewonnen' }
  return { emoji: '🔥', label: 'HOT', hint: '2 sessies op rij gewonnen' }
}

export default function HomeHero({ players, sessions, matches }) {
  const completedSessions = sessions.filter((s) => s.is_completed)
  if (completedSessions.length === 0) return null

  const leader = computeRankingFromMatches(players, matches).filter((p) => p.played > 0)[0]
  if (!leader) return null

  const streaks = computeCurrentSessionStreaks(players, sessions, matches)
  const hottest = streaks.find((s) => s.streak >= 2)
  const hottestPlayer = hottest ? players.find((p) => p.id === hottest.player_id) : null
  const hottest_info = hottest ? streakInfo(hottest.streak) : null

  return (
    <div className="bg-primary/10 rounded-2xl p-4 mb-6 space-y-2 max-w-sm mx-auto text-center">
      <div>
        <div className="flex items-center justify-center gap-2.5">
          <PlayerAvatar player={leader} size={32} />
          <p className="text-sm text-gray-800">
            👑 <span className="font-semibold">{leader.name}</span> leidt met {leader.winPct}%
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Hoogste win% over alle sessies</p>
      </div>
      {hottestPlayer && (
        <div>
          <div className="flex items-center justify-center gap-2.5">
            <PlayerAvatar player={hottestPlayer} size={32} />
            <p className="text-sm text-gray-800">
              {hottest_info.emoji} <span className="font-semibold">{hottestPlayer.name}</span> — {hottest_info.label}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{hottest_info.hint}</p>
        </div>
      )}
      <p className="text-xs text-gray-500">🎾 {completedSessions.length} sessies gespeeld</p>
    </div>
  )
}
