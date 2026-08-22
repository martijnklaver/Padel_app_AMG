import PlayerAvatar from '../shared/PlayerAvatar'

export default function PopperSection({ playerIds, players, nicknames, counts, onChange }) {
  const playerName = (id) => nicknames?.[id]?.trim() || players.find(p => p.id === id)?.name || '?'
  const playerObj = (id) => players.find(p => p.id === id)

  const adjust = (id, delta) =>
    onChange({ ...counts, [id]: Math.max(0, (counts[id] || 0) + delta) })

  return (
    <div className="mt-2 pt-2 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Poppers 🎾</p>
      {/* grid-flow-col vult eerst kolom 1 (team1_p1, team1_p2), dan kolom 2
          (team2_p1, team2_p2) — zo blijft de linker/rechter kolom in lijn met
          de team1/team2 volgorde uit de scoreinvoer erboven. */}
      <div className="grid grid-cols-2 grid-rows-2 grid-flow-col gap-x-2 gap-y-1.5">
        {playerIds.map(id => (
          <div key={id} className="flex items-center gap-1.5 min-w-0">
            <PlayerAvatar player={playerObj(id)} size={24} />
            <span className="flex-1 text-xs text-gray-600 truncate min-w-0">{playerName(id)}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => adjust(id, -1)}
                className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm leading-none"
              >
                −
              </button>
              <span className="w-4 text-center text-sm font-bold text-gray-800 tabular-nums">{counts[id] || 0}</span>
              <button
                type="button"
                onClick={() => adjust(id, 1)}
                className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm leading-none"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
