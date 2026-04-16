import { computeRanking } from '../utils/tournament'

export default function RankingFooter({ players }) {
  const ranked = computeRanking(players)

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Live Ranking
        </span>
      </div>

      <div className="overflow-x-auto max-h-48">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-wider">
              <th className="text-center px-3 py-1.5 w-8">#</th>
              <th className="text-left px-3 py-1.5">Naam</th>
              <th className="text-center px-3 py-1.5">Ptn</th>
              <th className="text-center px-3 py-1.5">Gespeeld</th>
              <th className="text-center px-3 py-1.5">%</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr
                key={p.id}
                className={`border-t border-gray-50 ${i === 0 ? 'bg-primary-light' : ''}`}
              >
                <td className="text-center px-3 py-1.5 font-bold text-gray-400 text-xs">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </td>
                <td className="px-3 py-1.5 font-medium text-gray-900">{p.name}</td>
                <td className="text-center px-3 py-1.5 font-mono font-semibold text-gray-700">
                  {p.points_won}
                </td>
                <td className="text-center px-3 py-1.5 font-mono text-gray-500">
                  {p.points_played}
                </td>
                <td className="text-center px-3 py-1.5 font-mono text-primary font-semibold">
                  {p.percentage !== null ? `${p.percentage}%` : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
