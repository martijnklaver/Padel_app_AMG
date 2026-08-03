import PlayerAvatar from '../shared/PlayerAvatar'

export default function PopperSection({ playerIds, players, nicknames, counts, onChange }) {
  const playerName = (id) => nicknames?.[id]?.trim() || players.find(p => p.id === id)?.name || '?'
  const playerObj = (id) => players.find(p => p.id === id)

  const adjust = (id, delta) =>
    onChange({ ...counts, [id]: Math.max(0, (counts[id] || 0) + delta) })

  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Poppers</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {playerIds.map(id => (
          <div key={id} className="flex items-center gap-1.5">
            <PlayerAvatar player={playerObj(id)} size={22} />
            <span className="flex-1 text-xs text-gray-600 truncate min-w-0">{playerName(id)}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => adjust(id, -1)}
                className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 text-base leading-none"
              >
                −
              </button>
              <span className="w-5 text-center text-sm font-bold text-gray-800 tabular-nums">{counts[id] || 0}</span>
              <button
                type="button"
                onClick={() => adjust(id, 1)}
                className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 text-base leading-none"
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
