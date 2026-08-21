import { computeRankingFromMatches, assignPositions } from '../../utils/tournament'

function sessionWinnerNames(session, players, matches) {
  const sessionPlayers = players.filter((p) => session.player_ids?.includes(p.id))
  const sessionMatches = matches.filter((m) => m.session_id === session.id && m.is_completed)
  if (sessionMatches.length === 0) return []

  const ranking = assignPositions(
    computeRankingFromMatches(sessionPlayers, sessionMatches).filter((p) => p.played > 0),
    (p) => p.winPct
  )
  return ranking.filter((p) => p.position === 1).map((p) => p.name)
}

export default function SessionListItem({ session, players, matches, onClick, onDelete, onEdit }) {
  const dateStr = new Date(session.date + 'T12:00:00').toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const hasPhoto = !!session.photo_url
  const winners = sessionWinnerNames(session, players, matches ?? [])

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-2xl border overflow-hidden ${
        hasPhoto ? 'border-gray-200' : 'card hover:border-primary/30 transition-colors'
      }`}
    >
      {hasPhoto && (
        <>
          <img
            src={session.photo_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
        </>
      )}

      <button
        onClick={onClick}
        className={`relative z-10 flex-1 text-left min-w-0 ${hasPhoto ? 'p-4' : ''}`}
      >
        <p className={`font-semibold text-sm ${hasPhoto ? 'text-white' : 'text-gray-900'}`}>
          {dateStr}
        </p>
        {session.location && (
          <p className={`text-xs mt-0.5 truncate ${hasPhoto ? 'text-white/85' : 'text-gray-500'}`}>
            📍 {session.location}
          </p>
        )}
        {winners.length > 0 && (
          <p className={`text-xs mt-0.5 font-medium ${hasPhoto ? 'text-white' : 'text-amber-700'}`}>
            🏆 {winners.join(' & ')}
          </p>
        )}
      </button>

      <div className={`relative z-10 flex items-center gap-1 shrink-0 ${hasPhoto ? 'pr-3' : ''}`}>
        {session.is_active && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap">
            🟠 Actief
          </span>
        )}
        {!session.is_active && onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(session) }}
            className={`p-1 text-xs opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity ${
              hasPhoto ? 'text-white/80 hover:text-white' : 'text-gray-300 hover:text-gray-500'
            }`}
            title="Sessie bewerken"
          >
            ✏️
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(session) }}
            className={`p-1 text-xs opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity ${
              hasPhoto ? 'text-white/80 hover:text-white' : 'text-gray-300 hover:text-gray-500'
            }`}
            title="Sessie verwijderen"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  )
}
