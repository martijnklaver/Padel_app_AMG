import { useState } from 'react'
import { computeSessionRanking } from '../../utils/tournament'

export default function LiveRanking({ session, players, matches }) {
  const [open, setOpen] = useState(false)

  const ranking = computeSessionRanking(session, players, matches)
  const top = ranking[0]

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2 flex items-center justify-between text-sm"
      >
        <span className="font-semibold text-gray-700">
          Ranking {top ? `· ${top.name} leidt (${top.winPct ?? 0}%)` : ''}
        </span>
        <span className="text-gray-400 text-xs">{open ? '▼' : '▲'}</span>
      </button>

      {open && (
        <div className="px-4 pb-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left pb-1 font-medium">#</th>
                <th className="text-left pb-1 font-medium">Naam</th>
                <th className="text-right pb-1 font-medium">Gew.</th>
                <th className="text-right pb-1 font-medium">Gesp.</th>
                <th className="text-right pb-1 font-medium">Win%</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((p, i) => (
                <tr key={p.id} className={i === 0 ? 'font-semibold text-primary' : 'text-gray-700'}>
                  <td className="py-1">{i + 1}</td>
                  <td className="py-1">{p.name}</td>
                  <td className="text-right py-1">{p.wins}</td>
                  <td className="text-right py-1">{p.played}</td>
                  <td className="text-right py-1">{p.winPct !== null ? `${p.winPct}%` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
