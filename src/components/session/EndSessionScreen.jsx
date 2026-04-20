import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { computeSessionRanking } from '../../utils/tournament'

export default function EndSessionScreen({ session, players, onBack }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMatches = useCallback(async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('session_id', session.id)
    setMatches(data ?? [])
    setLoading(false)
  }, [session.id])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  const dateStr = new Date(session.date + 'T12:00:00').toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const sessionPlayers = players.filter((p) => session.player_ids.includes(p.id))
  const ranking = loading ? [] : computeSessionRanking(session, players, matches)

  const medals = ['🏆', '🥈', '🥉']

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="text-center mb-6 pt-4">
        <div className="text-4xl mb-2">🎾</div>
        <h2 className="text-xl font-bold text-gray-900">Sessie afgerond!</h2>
        <p className="text-sm text-gray-500 mt-1">{dateStr}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sessionPlayers.map((p) => p.name).join(', ')}</p>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8">Laden...</p>
      ) : (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">Eindstand</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-100">
                <th className="text-left pb-2 font-medium">#</th>
                <th className="text-left pb-2 font-medium">Naam</th>
                <th className="text-right pb-2 font-medium">Gew.</th>
                <th className="text-right pb-2 font-medium">Gesp.</th>
                <th className="text-right pb-2 font-medium">Win%</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((p, i) => (
                <tr key={p.id} className={i === 0 ? 'font-bold text-primary' : 'text-gray-700'}>
                  <td className="py-2">{medals[i] ?? i + 1}</td>
                  <td className="py-2">{p.name}</td>
                  <td className="text-right py-2">{p.wins}</td>
                  <td className="text-right py-2">{p.played}</td>
                  <td className="text-right py-2">{p.winPct !== null ? `${p.winPct}%` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={onBack} className="btn-secondary w-full mt-4">
        Terug naar home
      </button>
    </div>
  )
}
