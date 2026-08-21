import { useState } from 'react'
import { ACHIEVEMENTS, STACKABLE_ACHIEVEMENT_KEYS } from '../../utils/achievements'
import PlayerAvatar from '../shared/PlayerAvatar'

function PlayerAchievementDot({ player, earned, stackable }) {
  return (
    <div className="relative shrink-0" title={player.name}>
      <div className={earned ? '' : 'opacity-25'}>
        <PlayerAvatar player={player} size={26} />
      </div>
      {earned && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white leading-none ${
            stackable ? 'bg-primary' : 'bg-green-500'
          }`}
        >
          {stackable ? earned.count : '✓'}
        </span>
      )}
    </div>
  )
}

function AchievementRow({ achievementKey, meta, stackable, players, achievementsByPlayer }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="card !p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="relative min-w-0">
          <button
            type="button"
            onClick={() => setShowTooltip((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-800 text-left"
          >
            <span className="shrink-0">{meta.icon}</span>
            <span className="truncate">{meta.label}</span>
          </button>
          {showTooltip && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowTooltip(false)} />
              <div className="absolute top-full mt-1.5 left-0 z-20 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 w-56 shadow-lg">
                {meta.description}
              </div>
            </>
          )}
        </div>
        <span
          className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
            stackable ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {stackable ? 'stapelbaar' : 'eenmalig'}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {players.map((p) => (
          <PlayerAchievementDot
            key={p.id}
            player={p}
            earned={achievementsByPlayer.get(p.id)?.get(achievementKey)}
            stackable={stackable}
          />
        ))}
      </div>
    </div>
  )
}

export default function AchievementsOverviewScreen({ players, achievementsByPlayer, onBack }) {
  return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      <div className="flex items-center gap-3 mb-5 pt-2">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-700 transition-colors text-lg leading-none"
          title="Terug naar spelersprofiel"
        >
          ←
        </button>
        <h2 className="text-xl font-bold text-gray-900">🏅 Alle achievements</h2>
      </div>

      <div className="space-y-2.5">
        {Object.entries(ACHIEVEMENTS).map(([key, meta]) => (
          <AchievementRow
            key={key}
            achievementKey={key}
            meta={meta}
            stackable={STACKABLE_ACHIEVEMENT_KEYS.has(key)}
            players={players}
            achievementsByPlayer={achievementsByPlayer}
          />
        ))}
      </div>
    </div>
  )
}
