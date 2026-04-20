import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { computeSessionRanking } from '../../utils/tournament'

export default function SessionReplayCard({ sessions, players }) {
  const [selectedId, setSelectedId] = useState('')
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)

  const completedSessions = sessions.filter((s) => s.is_completed)

  const fetchMatches = useCallback(async (sessionId) => {
    if (!sessionId) return
    setLoading(true)
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('session_id', sessionId)
      .order('round_number')
    setMatches(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (selectedId) fetchMatches(selectedId)
    else setMatches([])
  }, [selectedId, fetchMatches])

  const selectedSession = sessions.find((s) => s.id === selectedId)
  const ranking = selectedSession
    ? computeSessionRanking(selectedSession, players, matches)
    : []

  const playerName = (id) => players.find((p) => p.id === id)?.name ?? '?'

  const dateStr = (s) =>
    new Date(s.date + 'T12:00:00').toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

  const rounds = [...new Set(matches.map((m) => m.round_number))].sort((a, b) => a - b)

  const scoreLabel = (m) => {
    if (!selectedSession) return ''
    if (selectedSession.score_mode === 'games') return m.winner === 1 ? '1–0' : '0–1'
    return `${m.score_team1}–${m.score_team2}`
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-700 mb-3">Per sessie terugkijken</h3>

      {completedSessions.length === 0 ? (
        <p className="text-gray-400 text-sm">Nog geen afgeronde sessies</p>
      ) : (
        <>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Kies een sessie...</option>
            {completedSessions.map((s) => (
              <option key={s.id} value={s.id}>{dateStr(s)}</option>
            ))}
          </select>

          {loading && <p className="text-gray-400 text-sm text-center py-4">Laden...</p>}

          {!loading && selectedSession && (
            <>
              <p className="text-xs text-gray-400 mb-3">
                {players.filter((p) => selectedSession.player_ids.includes(p.id)).map((p) => p.name).join(', ')}
              </p>

              {/* Eindstand */}
              <table className="w-full text-xs mb-4">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-1 font-medium">#</th>
                    <th className="text-left pb-1 font-medium">Naam</th>
                    <th className="text-right pb-1 font-medium">Win%</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((p, i) => (
                    <tr key={p.id} className={i === 0 ? 'font-bold text-primary' : 'text-gray-700'}>
                      <td className="py-1">{i + 1}</td>
                      <td className="py-1">{p.name}</td>
                      <td className="text-right py-1">{p.winPct !== null ? `${p.winPct}%` : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Wedstrijden per ronde */}
              <div className="space-y-2">
                {rounds.map((r) => (
                  <div key={r} className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs font-semibold text-gray-400 mb-1">Ronde {r}</p>
                    {matches
                      .filter((m) => m.round_number === r)
                      .map((m) => (
                        <div key={m.id} className="text-xs text-gray-700 flex justify-between">
                          <span>
                            <span className={m.winner === 1 ? 'font-semibold' : ''}>
                              {playerName(m.team1_p1)} & {playerName(m.team1_p2)}
                            </span>
                            <span className="text-gray-300 mx-1">vs</span>
                            <span className={m.winner === 2 ? 'font-semibold' : ''}>
                              {playerName(m.team2_p1)} & {playerName(m.team2_p2)}
                            </span>
                          </span>
                          <span className="font-semibold ml-2 shrink-0">{scoreLabel(m)}</span>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
