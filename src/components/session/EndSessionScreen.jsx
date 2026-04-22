import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { computeSessionRanking, computeRankingFromMatches } from '../../utils/tournament'
import ConfirmDialog from '../shared/ConfirmDialog'

export default function EndSessionScreen({ session, players, onBack, onEdit }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('matches').delete().eq('session_id', session.id)
    await supabase.from('schedule').delete().eq('session_id', session.id)
    await supabase.from('sessions').delete().eq('id', session.id)
    setDeleting(false)
    setDeleteConfirm(false)
    onBack()
  }

  const dateStr = new Date(session.date + 'T12:00:00').toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const sessionPlayers = players.filter((p) => session.player_ids.includes(p.id))
  const isPoints = session.score_mode === 'points'
  const medals = ['🏆', '🥈', '🥉']

  const pointsRanking = loading ? [] : computeSessionRanking(session, players, matches)
  const potjesRanking = loading ? [] : computeRankingFromMatches(sessionPlayers, matches)

  return (
    <div className="max-w-lg mx-auto p-4 pb-8">
      {/* Header */}
      <div className="flex items-start gap-3 pt-4 mb-6">
        <div className="flex-1 text-center">
          <div className="text-4xl mb-2">🎾</div>
          <h2 className="text-xl font-bold text-gray-900">Sessie afgerond!</h2>
          <p className="text-sm text-gray-500 mt-1">{dateStr}</p>
          <p className="text-xs text-gray-400 mt-0.5">{sessionPlayers.map((p) => p.name).join(', ')}</p>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(session)}
              className="p-2 text-gray-400 hover:text-primary transition-colors rounded-lg hover:bg-gray-100"
              title="Sessie bewerken"
            >
              ✏️
            </button>
          )}
          <button
            onClick={() => setDeleteConfirm(true)}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100"
            title="Sessie verwijderen"
          >
            🗑️
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8">Laden...</p>
      ) : isPoints ? (
        <div className="flex flex-col md:flex-row gap-4">
          {/* Punten ranking */}
          <div className="card flex-1 min-w-0">
            <h3 className="font-semibold text-gray-700 mb-3 text-xs uppercase tracking-wide">Punten ranking</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">#</th>
                  <th className="text-left pb-2 font-medium">Naam</th>
                  <th className="text-right pb-2 font-medium">Pnt. gew.</th>
                  <th className="text-right pb-2 font-medium">Pnt. gesp.</th>
                  <th className="text-right pb-2 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {pointsRanking.map((p, i) => (
                  <tr key={p.id} className={i === 0 ? 'font-bold text-primary' : 'text-gray-700'}>
                    <td className="py-2">{medals[i] ?? i + 1}</td>
                    <td className="py-2">{p.name}</td>
                    <td className="text-right py-2">{p.pointsWon}</td>
                    <td className="text-right py-2">{p.pointsPlayed}</td>
                    <td className="text-right py-2">{p.pct !== null ? `${p.pct}%` : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Potjes ranking */}
          <div className="card flex-1 min-w-0">
            <h3 className="font-semibold text-gray-700 mb-3 text-xs uppercase tracking-wide">Potjes ranking</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">#</th>
                  <th className="text-left pb-2 font-medium">Naam</th>
                  <th className="text-right pb-2 font-medium">Pot. gew.</th>
                  <th className="text-right pb-2 font-medium">Pot. gesp.</th>
                  <th className="text-right pb-2 font-medium">Win%</th>
                </tr>
              </thead>
              <tbody>
                {potjesRanking.map((p, i) => (
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
        </div>
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
              {potjesRanking.map((p, i) => (
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

      {deleteConfirm && (
        <ConfirmDialog
          title="Sessie verwijderen?"
          message={`Weet je zeker dat je de sessie van ${dateStr} wilt verwijderen? Dit verwijdert ook alle wedstrijden en scores van die sessie.`}
          confirmLabel={deleting ? 'Verwijderen...' : 'Verwijderen'}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
