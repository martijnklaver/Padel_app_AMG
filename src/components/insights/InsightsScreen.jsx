import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import OverallStatsCard from './OverallStatsCard'
import PerformanceChart from './PerformanceChart'
import BestPlayerCard from './BestPlayerCard'
import BestDuoCard from './BestDuoCard'
import FairestMatchupCard from './FairestMatchupCard'
import SessionReplayCard from './SessionReplayCard'

const LIMIT_OPTIONS = [
  { label: 'Alle sessies', value: null },
  { label: 'Laatste 3', value: 3 },
  { label: 'Laatste 5', value: 5 },
  { label: 'Laatste 10', value: 10 },
]

export default function InsightsScreen({ players }) {
  const [matches, setMatches] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [sessionLimit, setSessionLimit] = useState(null)

  const fetchData = useCallback(async () => {
    const [{ data: allMatches }, { data: allSessions }] = await Promise.all([
      supabase.from('matches').select('*').eq('is_completed', true),
      supabase.from('sessions').select('*').order('date', { ascending: false }),
    ])
    setMatches(allMatches ?? [])
    setSessions(allSessions ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // sessions is ordered DESC (newest first); slice gives the most recent N
  const filteredSessions = sessionLimit ? sessions.slice(0, sessionLimit) : sessions
  const filteredSessionIds = new Set(filteredSessions.map((s) => s.id))
  const filteredMatches = matches.filter((m) => filteredSessionIds.has(m.session_id))

  return (
    <div className="max-w-lg mx-auto p-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4 pt-2">Inzichten</h2>

      {/* Session filter */}
      <div className="mb-5">
        <p className="text-xs text-gray-500 mb-2">Toon inzichten over:</p>
        <div className="flex flex-wrap gap-1.5">
          {LIMIT_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setSessionLimit(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                sessionLimit === opt.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Laden...</p>
      ) : (
        <div className="space-y-4">
          <OverallStatsCard players={players} matches={filteredMatches} />
          <PerformanceChart players={players} sessions={filteredSessions} matches={filteredMatches} />
          <BestPlayerCard players={players} matches={filteredMatches} />
          <BestDuoCard players={players} matches={filteredMatches} />
          <FairestMatchupCard players={players} matches={filteredMatches} />
          <SessionReplayCard sessions={filteredSessions} players={players} />
        </div>
      )}
    </div>
  )
}
