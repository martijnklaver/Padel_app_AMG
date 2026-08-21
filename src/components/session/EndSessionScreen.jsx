import { useState, useEffect, useCallback } from 'react'
import { supabase, runHistoricalAchievements } from '../../supabaseClient'
import { computeSessionRanking, computeRankingFromMatches, assignPositions } from '../../utils/tournament'
import ConfirmDialog from '../shared/ConfirmDialog'
import PlayerAvatar from '../shared/PlayerAvatar'
import SessionPhoto from './SessionPhoto'

function RankingTable({ title, ranking, columns }) {
  return (
    <div className="card flex-1 min-w-0 bg-gray-50 p-5">
      <h3 className="font-semibold text-gray-500 mb-4 text-xs uppercase tracking-wide">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-200">
              <th className="text-left pb-3 font-medium w-8">#</th>
              <th className="text-left pb-3 font-medium">Naam</th>
              {columns.map((col) => (
                <th key={col.label} className={`text-right pb-3 font-medium ${col.w ?? 'w-14'}`}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranking.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-gray-100 last:border-b-0 ${p.position === 1 ? 'bg-orange-50 font-bold text-primary' : 'text-gray-700'}`}
              >
                <td className="py-3">{p.medal ?? p.position}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar player={p} size={24} />
                    <span className="truncate">{p.name}</span>
                  </div>
                </td>
                {columns.map((col) => (
                  <td key={col.label} className={`text-right py-3 ${col.w ?? 'w-14'}`}>{col.render(p)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function EndSessionScreen({ session, players, onBack, onEdit, onReactivate, newAchievements = [] }) {
  const [matches, setMatches] = useState([])
  const [sessionPoppers, setSessionPoppers] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(session.photo_url ?? null)

  const fetchData = useCallback(async () => {
    const [{ data: matchData }, { data: popperData }] = await Promise.all([
      supabase.from('matches').select('*').eq('session_id', session.id),
      supabase.from('poppers').select('*').eq('session_id', session.id),
    ])
    setMatches(matchData ?? [])
    setSessionPoppers(popperData ?? [])
    setLoading(false)
  }, [session.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setPhotoUrl(session.photo_url ?? null)
  }, [session.id, session.photo_url])

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('matches').delete().eq('session_id', session.id)
    await supabase.from('schedule').delete().eq('session_id', session.id)
    await supabase.from('sessions').delete().eq('id', session.id)
    // Achievements zijn afgeleid van de sessiegeschiedenis — na een verwijdering
    // klopt alleen een volledige herberekening nog met de werkelijke data.
    await runHistoricalAchievements()
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

  // Popper ranking for this session
  const popperRanking = (() => {
    if (loading || sessionPoppers.length === 0) return []
    const totals = {}
    sessionPoppers.forEach(p => { totals[p.player_id] = (totals[p.player_id] || 0) + p.count })
    const played = {}
    matches.forEach(m => {
      [m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2].forEach(id => {
        played[id] = (played[id] || 0) + 1
      })
    })
    return sessionPlayers
      .map(p => ({
        ...p,
        total: totals[p.id] || 0,
        avg: played[p.id] ? ((totals[p.id] || 0) / played[p.id]).toFixed(1) : '0.0',
      }))
      .filter(p => p.total > 0)
      .sort((a, b) => b.total - a.total)
  })()

  return (
    <div className="max-w-3xl mx-auto p-4 pb-8">
      {/* Header */}
      <div className="text-center pt-4 mb-8">
        <div className="text-4xl mb-3">🎾</div>
        <h2 className="text-xl font-bold text-gray-900">Sessie afgerond!</h2>
        <p className="text-base font-medium text-gray-600 mt-2">
          {dateStr}{session.location ? ` · ${session.location}` : ''}
        </p>
      </div>

      <SessionPhoto sessionId={session.id} photoUrl={photoUrl} onUpdated={setPhotoUrl} />

      {/* Nieuwe achievements van deze sessie */}
      {newAchievements.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 mb-6">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">🎉 Nieuwe achievements</p>
          <div className="flex flex-wrap gap-2">
            {newAchievements.map((a) => (
              <div
                key={`${a.player_id}-${a.achievement_key}`}
                className="flex items-start gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2 max-w-full sm:max-w-xs"
              >
                <span className="text-xl shrink-0">{a.icon}</span>
                <div className="leading-tight min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {a.playerName} <span className="font-normal text-gray-500">— {a.label}</span>
                  </p>
                  {a.description && <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spelersvolgorde */}
      {session.player_order?.length === 5 && (
        <div className="card bg-gray-50 p-4 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Spelersvolgorde</p>
          <p className="text-sm text-gray-700">
            {session.player_order.map((id, i) => {
              const name = players.find((p) => p.id === id)?.name || '?'
              return `Speler ${i + 1}: ${name}`
            }).join(' | ')}
          </p>
        </div>
      )}

      {/* Rankings */}
      {loading ? (
        <p className="text-center text-gray-400 py-8">Laden...</p>
      ) : isPoints ? (
        <div className="flex flex-col md:flex-row gap-4">
          <RankingTable
            title="Punten ranking"
            ranking={pointsRanking}
            columns={[
              { label: 'Pnt. gew.', w: 'w-16', render: (p) => p.pointsWon },
              { label: 'Pnt. gesp.', w: 'w-16', render: (p) => p.pointsPlayed },
              { label: '%', w: 'w-12', render: (p) => p.pct !== null ? `${p.pct}%` : '–' },
            ]}
          />
          <RankingTable
            title="Potjes ranking"
            ranking={potjesRanking}
            columns={[
              { label: 'Pot. gew.', w: 'w-14', render: (p) => p.wins },
              { label: 'Pot. gesp.', w: 'w-14', render: (p) => p.played },
              { label: 'Win%', w: 'w-12', render: (p) => p.winPct !== null ? `${p.winPct}%` : '–' },
            ]}
          />
        </div>
      ) : (
        <div className="card bg-gray-50 p-5">
          <h3 className="font-semibold text-gray-500 mb-4 text-xs uppercase tracking-wide">Eindstand</h3>
          <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-200">
                <th className="text-left pb-3 font-medium w-8">#</th>
                <th className="text-left pb-3 font-medium">Naam</th>
                <th className="text-right pb-3 font-medium w-14">Gew.</th>
                <th className="text-right pb-3 font-medium w-14">Gesp.</th>
                <th className="text-right pb-3 font-medium w-12">Win%</th>
              </tr>
            </thead>
            <tbody>
              {potjesRanking.map((p) => (
                <tr key={p.id} className={`border-b border-gray-100 last:border-b-0 ${p.position === 1 ? 'bg-orange-50 font-bold text-primary' : 'text-gray-700'}`}>
                  <td className="py-3">{p.medal ?? p.position}</td>
                  <td className="py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar player={p} size={24} />
                    <span className="truncate">{p.name}</span>
                  </div>
                </td>
                  <td className="text-right py-3 w-14">{p.wins}</td>
                  <td className="text-right py-3 w-14">{p.played}</td>
                  <td className="text-right py-3 w-12">{p.winPct !== null ? `${p.winPct}%` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Poppermeister van de dag */}
      {!loading && popperRanking.length > 0 && (
        <div className="mt-4 bg-gray-50 rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🎾 Poppermeister van de dag</p>

          {/* Winnaar */}
          <div className="flex items-center gap-3 mb-4">
            <PlayerAvatar player={popperRanking[0]} size={48} />
            <div>
              <p className="font-bold text-gray-900 text-sm">{popperRanking[0].name}</p>
              <p className="text-xs text-gray-500 mb-1">{popperRanking[0].total} poppers</p>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Poppermeister 🏆
              </span>
            </div>
          </div>

          {/* Ranglijst */}
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-200">
                <th className="text-left pb-2 font-medium">Naam</th>
                <th className="text-right pb-2 font-medium">Poppers</th>
                <th className="text-right pb-2 font-medium whitespace-nowrap">Per potje</th>
              </tr>
            </thead>
            <tbody>
              {popperRanking.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-1.5">
                    <div className="flex items-center gap-1.5">
                      <PlayerAvatar player={p} size={18} />
                      <span className="text-gray-700">{p.name}</span>
                    </div>
                  </td>
                  <td className="text-right py-1.5 text-gray-700">{p.total}</td>
                  <td className="text-right py-1.5 text-gray-500">{p.avg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Buttons */}
      <div className="mt-8 space-y-3">
        {onReactivate && (
          <button
            onClick={() => onReactivate(session)}
            className="btn-secondary w-full"
          >
            🔄 Sessie heractiveren
          </button>
        )}
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
