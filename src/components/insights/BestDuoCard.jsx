import { computeBestDuo } from '../../utils/tournament'

export default function BestDuoCard({ players, matches }) {
  const duos = computeBestDuo(players, matches)

  if (duos.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-2">Beste duo</h3>
        <p className="text-gray-400 text-sm">Nog geen data</p>
      </div>
    )
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-700 mb-3">Beste duo</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs border-b border-gray-100">
            <th className="text-left pb-2 font-medium">#</th>
            <th className="text-left pb-2 font-medium">Duo</th>
            <th className="text-right pb-2 font-medium">Samen</th>
            <th className="text-right pb-2 font-medium">Win%</th>
          </tr>
        </thead>
        <tbody>
          {duos.map((d, i) => (
            <tr key={d.ids.join('|')} className={i === 0 ? 'font-bold text-primary' : 'text-gray-700'}>
              <td className="py-2">{medals[i] ?? i + 1}</td>
              <td className="py-2">{d.names.join(' & ')}</td>
              <td className="text-right py-2">{d.played}</td>
              <td className="text-right py-2">{d.winPct !== null ? `${d.winPct}%` : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
