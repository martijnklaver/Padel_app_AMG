import { computeRankingFromMatches } from '../../utils/tournament'
import PlayerAvatar from '../shared/PlayerAvatar'

export default function BestPlayerCard({ players, matches }) {
  const ranking = computeRankingFromMatches(players, matches).filter((p) => p.played > 0)

  if (ranking.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-2">Beste speler overall</h3>
        <p className="text-gray-400 text-sm">Nog geen data</p>
      </div>
    )
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-700 mb-3">Beste speler overall</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs border-b border-gray-100">
            <th className="text-left pb-2 font-medium">#</th>
            <th className="text-left pb-2 font-medium">Naam</th>
            <th className="text-right pb-2 font-medium">Wedstr.</th>
            <th className="text-right pb-2 font-medium">Win%</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((p, i) => (
            <tr key={p.id} className={i === 0 ? 'font-bold text-primary' : 'text-gray-700'}>
              <td className="py-2">{medals[i] ?? i + 1}</td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <PlayerAvatar player={p} size={22} />
                  <span>{p.name}</span>
                </div>
              </td>
              <td className="text-right py-2">{p.played}</td>
              <td className="text-right py-2">{p.winPct !== null ? `${p.winPct}%` : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
