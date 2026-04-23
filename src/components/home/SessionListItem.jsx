export default function SessionListItem({ session, players, onClick, onDelete, onEdit }) {
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
    <div className="card flex items-center gap-3 hover:border-primary/30 transition-colors">
      <button onClick={onClick} className="flex-1 text-left min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{dateStr}</p>
        {session.location && (
          <p className="text-gray-500 text-xs mt-0.5 truncate">📍 {session.location}</p>
        )}
      </button>

      <div className="flex items-center gap-1 shrink-0">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>
        {!session.is_active && onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(session) }}
            className="p-1.5 text-gray-400 hover:text-primary transition-colors"
            title="Sessie bewerken"
          >
            ✏️
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(session) }}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            title="Sessie verwijderen"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  )
}
