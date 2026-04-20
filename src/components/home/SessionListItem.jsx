export default function SessionListItem({ session, players, onClick }) {
  const sessionPlayers = players
    .filter((p) => session.player_ids.includes(p.id))
    .map((p) => p.name)

  const dateStr = new Date(session.date + 'T12:00:00').toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const badge = session.is_active
    ? { label: 'Actief', cls: 'bg-primary/10 text-primary' }
    : session.is_completed
    ? { label: 'Afgerond', cls: 'bg-green-100 text-green-700' }
    : { label: 'Gestopt', cls: 'bg-gray-100 text-gray-500' }

  return (
    <button
      onClick={onClick}
      className="card w-full text-left flex items-center justify-between gap-3 hover:border-primary/30 transition-colors"
    >
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{dateStr}</p>
        <p className="text-gray-500 text-xs mt-0.5 truncate">{sessionPlayers.join(', ')}</p>
      </div>
      <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${badge.cls}`}>
        {badge.label}
      </span>
    </button>
  )
}
