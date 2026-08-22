import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { ACHIEVEMENTS } from '../../utils/achievements'
import PlayerAvatar from '../shared/PlayerAvatar'

export default function SessionAchievements({ sessionId, players, nicknames }) {
  const [rows, setRows] = useState([])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('achievements')
      .select('player_id, achievement_key')
      .eq('session_id', sessionId)
      .then(({ data }) => { if (!cancelled) setRows(data ?? []) })
    return () => { cancelled = true }
  }, [sessionId])

  if (rows.length === 0) return null

  const playerName = (id) => nicknames?.[id]?.trim() || players.find((p) => p.id === id)?.name || '?'

  const byPlayer = new Map()
  rows.forEach((r) => {
    if (!byPlayer.has(r.player_id)) byPlayer.set(r.player_id, [])
    byPlayer.get(r.player_id).push(r.achievement_key)
  })

  return (
    <div className="card bg-gray-50 p-4 mt-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🏅 Achievements deze sessie</p>
      <div className="space-y-3">
        {[...byPlayer.entries()].map(([playerId, keys]) => (
          <div key={playerId} className="flex items-center gap-3">
            <PlayerAvatar player={players.find((p) => p.id === playerId)} size={32} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{playerName(playerId)}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {keys.map((key, i) => {
                  const meta = ACHIEVEMENTS[key]
                  return (
                    <span
                      key={`${key}-${i}`}
                      title={meta?.description}
                      className="inline-flex items-center gap-1 text-[11px] font-medium bg-white border border-gray-200 rounded-full px-2 py-0.5"
                    >
                      <span>{meta?.icon ?? '🏅'}</span>
                      {meta?.label ?? key}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
