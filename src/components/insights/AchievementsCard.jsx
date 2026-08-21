import { ACHIEVEMENTS } from '../../utils/achievements'
import PlayerAvatar from '../shared/PlayerAvatar'

const dateStr = (d) =>
  new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })

export default function AchievementsCard({ players, achievements }) {
  const byPlayer = new Map()
  achievements.forEach((a) => {
    if (!byPlayer.has(a.player_id)) byPlayer.set(a.player_id, [])
    byPlayer.get(a.player_id).push(a)
  })

  const playersWithBadges = players
    .map((p) => ({
      ...p,
      badges: (byPlayer.get(p.id) ?? []).slice().sort((a, b) => b.achieved_at.localeCompare(a.achieved_at)),
    }))
    .filter((p) => p.badges.length > 0)
    .sort((a, b) => b.badges.length - a.badges.length)

  if (playersWithBadges.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-2">Achievements</h3>
        <p className="text-gray-400 text-sm">Nog geen achievements behaald</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-700 mb-3">Achievements</h3>
      <div className="space-y-4">
        {playersWithBadges.map((p) => (
          <div key={p.id}>
            <div className="flex items-center gap-2 mb-2">
              <PlayerAvatar player={p} size={22} />
              <span className="text-sm font-semibold text-gray-800">{p.name}</span>
              <span className="text-xs text-gray-400">({p.badges.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {p.badges.map((b) => {
                const meta = ACHIEVEMENTS[b.achievement_key]
                return (
                  <span
                    key={b.id}
                    className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-full whitespace-nowrap"
                  >
                    {meta?.icon ?? '🏅'} {meta?.label ?? b.achievement_key} · {dateStr(b.achieved_at)}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
