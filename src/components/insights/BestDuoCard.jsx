import { useState } from 'react'
import { computeBestDuo, computeBestDuoByPoints } from '../../utils/tournament'

const MEDALS = ['🥇', '🥈', '🥉']

export default function BestDuoCard({ players, matches, scoreModeFilter }) {
  const [showAll, setShowAll] = useState(false)
  const isPoints = scoreModeFilter === 'points'
  const duos = isPoints ? computeBestDuoByPoints(players, matches) : computeBestDuo(players, matches)

  if (duos.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-2">Beste duo</h3>
        <p className="text-gray-400 text-sm">Nog geen data</p>
      </div>
    )
  }

  const top3 = duos.slice(0, 3)
  const rest = duos.slice(3)
  const pctOf = (d) => (isPoints ? d.pct : d.winPct)

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-700 mb-3">Beste duo</h3>

      <div className="space-y-1.5">
        {top3.map((d, i) => {
          const pct = pctOf(d)
          return (
            <div
              key={d.ids.join('|')}
              className={`text-sm rounded-lg px-3 py-2 ${
                i === 0
                  ? 'bg-amber-50 border border-amber-200 font-bold text-gray-900'
                  : 'bg-gray-50 text-gray-700'
              }`}
            >
              {MEDALS[i]} {d.names.join(' & ')} — {pct !== null ? `${pct}%` : '–'}
            </div>
          )
        })}
      </div>

      {rest.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs text-gray-500 hover:text-primary font-medium transition-colors mt-3"
          >
            Toon alle duo's {showAll ? '▲' : '▼'}
          </button>

          {showAll && (
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">#</th>
                  <th className="text-left pb-2 font-medium">Duo</th>
                  <th className="text-right pb-2 font-medium">Samen</th>
                  <th className="text-right pb-2 font-medium">Win% ({isPoints ? 'punten' : 'potjes'})</th>
                </tr>
              </thead>
              <tbody>
                {duos.map((d, i) => {
                  const pct = pctOf(d)
                  return (
                    <tr key={d.ids.join('|')} className={i === 0 ? 'font-bold text-primary' : 'text-gray-700'}>
                      <td className="py-2">{MEDALS[i] ?? i + 1}</td>
                      <td className="py-2">{d.names.join(' & ')}</td>
                      <td className="text-right py-2">{d.played}</td>
                      <td className="text-right py-2">{pct !== null ? `${pct}%` : '–'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
