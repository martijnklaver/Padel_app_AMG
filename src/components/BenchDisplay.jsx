export default function BenchDisplay({ benchPlayers }) {
  if (!benchPlayers || benchPlayers.length === 0) return null

  return (
    <div className="card">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Bank deze ronde
      </h2>
      <div className="flex flex-wrap gap-2">
        {benchPlayers.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600
                       text-sm font-medium px-3 py-1.5 rounded-full"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
            {p.name}
          </span>
        ))}
      </div>
    </div>
  )
}
