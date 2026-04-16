import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { computeRanking } from '../utils/tournament'

export default function EndScreen({ players, onReset }) {
  const [resetting, setResetting] = useState(false)
  const ranked = computeRanking(players)

  const handleReset = async () => {
    setResetting(true)
    const dummy = '00000000-0000-0000-0000-000000000000'
    await supabase.from('schedule').delete().neq('id', dummy)
    await supabase.from('tournament_settings').delete().neq('id', dummy)
    await supabase.from('matches').delete().neq('id', dummy)
    await supabase.from('players').delete().neq('id', dummy)
    setResetting(false)
    onReset()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold text-gray-900">Toernooi afgelopen!</h1>
        <p className="text-gray-500 mt-1">Eindstand</p>
      </div>

      <div className="w-full max-w-md card mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <th className="text-center pb-2 w-8">#</th>
              <th className="text-left pb-2">Naam</th>
              <th className="text-center pb-2">Ptn</th>
              <th className="text-center pb-2">Gespeeld</th>
              <th className="text-center pb-2">%</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr
                key={p.id}
                className={`border-t border-gray-50 ${i === 0 ? 'bg-primary-light' : ''}`}
              >
                <td className="text-center py-2 font-bold text-gray-400 text-xs">
                  {i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </td>
                <td className="py-2 font-medium text-gray-900">{p.name}</td>
                <td className="text-center py-2 font-mono font-semibold text-gray-700">
                  {p.points_won}
                </td>
                <td className="text-center py-2 font-mono text-gray-500">
                  {p.points_played}
                </td>
                <td className="text-center py-2 font-mono text-primary font-semibold">
                  {p.percentage !== null ? `${p.percentage}%` : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleReset}
        disabled={resetting}
        className="btn-primary w-full max-w-md py-3 text-base"
      >
        {resetting ? 'Bezig...' : 'Nieuw toernooi starten'}
      </button>
    </div>
  )
}
