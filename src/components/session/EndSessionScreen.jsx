import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { computeSessionRanking, computeRankingFromMatches, assignPositions } from '../../utils/tournament'
import ConfirmDialog from '../shared/ConfirmDialog'

function RankingTable({ title, ranking, columns }) {
  return (
    <div className="card flex-1 min-w-0 bg-gray-50 p-5">
      <h3 className="font-semibold text-gray-500 mb-4 text-xs uppercase tracking-wide">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs border-b border-gray-100">
            <th className="text-left pb-2 font-medium">#</th>
            <th className="text-left pb-2 font-medium">Naam</th>
            {columns.map((col) => (
              <th key={col.label} className="text-right pb-2 font-medium">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {ranking.map((p) => (
            <tr
              key={p.id}
              className={p.position === 1 ? 'bg-orange-50 font-bold text-primary' : 'text-gray-700'}
            >
              <td className="py-2.5 pr-1">{p.medal ?? p.position}</td>
              <td className="py-2.5">{p.name}</td>
              {columns.map((col) => (
                <td key={col.label} className="text-right py-2.5">{col.render(p)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

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

  const pointsRanking = loading ? [] : assignPositions(
    computeSessionRanking(session, players, matches),
    (p) => p.pct
  )
  const potjesRanking = loading ? [] : assignPositions(
    computeRankingFromMatches(sessionPlayers, matches),
    (p) => p.winPct
  )

  return (
    <div className="max-w-lg mx-auto p-4 pb-8">
      {/* Header */}
      <div className="text-center pt-4 mb-8">
        <div className="text-4xl mb-3">🎾</div>
        <h2 className="text-xl font-bold text-gray-900">Sessie afgerond!</h2>
        <p className="text-base font-medium text-gray-600 mt-2">
          {dateStr}{session.location ? ` · ${session.location}` : ''}
        </p>
      </div>

      {/* Rankings */}
      {loading ? (
        <p className="text-center text-gray-400 py-8">Laden...</p>
      ) : isPoints ? (
        <div className="flex flex-col md:flex-row gap-4">
          <RankingTable
            title="Punten ranking"
            ranking={pointsRanking}
            columns={[
              { label: 'Pnt. gew.', render: (p) => p.pointsWon },
              { label: 'Pnt. gesp.', render: (p) => p.pointsPlayed },
              { label: '%', render: (p) => p.pct !== null ? `${p.pct}%` : '–' },
            ]}
          />
          <RankingTable
            title="Potjes ranking"
            ranking={potjesRanking}
            columns={[
              { label: 'Pot. gew.', render: (p) => p.wins },
              { label: 'Pot. gesp.', render: (p) => p.played },
              { label: 'Win%', render: (p) => p.winPct !== null ? `${p.winPct}%` : '–' },
            ]}
          />
        </div>
      ) : (
        <div className="card bg-gray-50 p-5">
          <h3 className="font-semibold text-gray-500 mb-4 text-xs uppercase tracking-wide">Eindstand</h3>
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
            <tbody className="divide-y divide-gray-100">
              {potjesRanking.map((p) => (
                <tr key={p.id} className={p.position === 1 ? 'bg-orange-50 font-bold text-primary' : 'text-gray-700'}>
                  <td className="py-2.5 pr-1">{p.medal ?? p.position}</td>
                  <td className="py-2.5">{p.name}</td>
                  <td className="text-right py-2.5">{p.wins}</td>
                  <td className="text-right py-2.5">{p.played}</td>
                  <td className="text-right py-2.5">{p.winPct !== null ? `${p.winPct}%` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Buttons */}
      <div className="mt-8 space-y-3">
        <button onClick={onBack} className="btn-primary w-full">
          Terug naar home
        </button>
        <div className="flex gap-6 justify-center pt-1">
          {onEdit && (
            <button
              onClick={() => onEdit(session)}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✏️ Bewerken
            </button>
          )}
          <button
            onClick={() => setDeleteConfirm(true)}
            className="text-sm text-red-400 hover:text-red-600 transition-colors"
          >
            🗑️ Verwijderen
          </button>
        </div>
      </div>

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
