import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import OverallStatsCard from './OverallStatsCard'
import PerformanceChart from './PerformanceChart'
import BestDuoCard from './BestDuoCard'
import FairestMatchupCard from './FairestMatchupCard'
import SessionReplayCard from './SessionReplayCard'
import PopperStatsCard from './PopperStatsCard'

const LIMIT_OPTIONS = [
  { label: 'Alle', value: null },
  { label: 'Laatste 3', value: 3 },
  { label: 'Laatste 5', value: 5 },
  { label: 'Laatste 10', value: 10 },
]

const SCORE_MODE_FILTER_OPTIONS = [
  { label: 'Alle', value: null },
  { label: 'Punten', value: 'points' },
  { label: 'Games', value: 'games' },
  { label: 'Sets', value: 'games_sets' },
]

const SESSION_TYPE_OPTIONS = [
  { label: 'Alle', value: null },
  { label: '5 spelers', value: 5 },
  { label: '4 spelers', value: 4 },
]

const COMPLETENESS_OPTIONS = [
  { label: 'Alle', value: false },
  { label: 'Alleen volledig', value: true },
]

function FilterChipRow({ label, options, value, onChange }) {
  return (
    <div className="flex items-start gap-2 flex-wrap">
      <span className="text-xs text-gray-400 pt-1 w-16 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={`text-sm px-3 py-1 rounded-full font-medium transition-colors ${
              value === opt.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function InsightsScreen({ players, onBack }) {
  const [matches, setMatches] = useState([])
  const [sessions, setSessions] = useState([])
  const [poppers, setPoppers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sessionLimit, setSessionLimit] = useState(null)
  const [scoreModeFilter, setScoreModeFilter] = useState(null)
  const [onlyComplete, setOnlyComplete] = useState(false)
  const [sessionTypeFilter, setSessionTypeFilter] = useState(null)

  const fetchData = useCallback(async () => {
    const [{ data: allMatches }, { data: allSessions }, { data: allPoppers }] = await Promise.all([
      supabase.from('matches').select('*').eq('is_completed', true),
      supabase.from('sessions').select('*').order('date', { ascending: false }),
      supabase.from('poppers').select('*'),
    ])
    setMatches(allMatches ?? [])
    setSessions(allSessions ?? [])
    setPoppers(allPoppers ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Volledig voor elke score modus: aantal afgeronde potjes moet gelijk zijn aan het geplande totaal
  const isSessionComplete = useCallback((session) => {
    const completedCount = matches.filter((m) => m.session_id === session.id).length
    return completedCount === session.total_matches
  }, [matches])

  const scopedSessions = sessionLimit ? sessions.slice(0, sessionLimit) : sessions
  const filteredSessions = scopedSessions.filter((s) => {
    if (scoreModeFilter && s.score_mode !== scoreModeFilter) return false
    if (sessionTypeFilter && (s.player_ids?.length ?? 0) !== sessionTypeFilter) return false
    if (onlyComplete && !isSessionComplete(s)) return false
    return true
  })
  const filteredSessionIds = new Set(filteredSessions.map((s) => s.id))
  const filteredMatches = matches.filter((m) => filteredSessionIds.has(m.session_id))
  const filteredPoppers = poppers.filter((p) => filteredSessionIds.has(p.session_id))

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center gap-3 mb-4 pt-2">
        {onBack && (
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-700 transition-colors text-lg leading-none"
            title="Terug naar home"
          >
            ←
          </button>
        )}
        <h2 className="text-xl font-bold text-gray-900">Inzichten</h2>
      </div>

      {/* Filters — altijd zichtbaar, compact */}
      <div className="mb-5 space-y-2">
        <FilterChipRow label="Periode" options={LIMIT_OPTIONS} value={sessionLimit} onChange={setSessionLimit} />
        <FilterChipRow label="Modus" options={SCORE_MODE_FILTER_OPTIONS} value={scoreModeFilter} onChange={setScoreModeFilter} />
        <FilterChipRow label="Spelers" options={SESSION_TYPE_OPTIONS} value={sessionTypeFilter} onChange={setSessionTypeFilter} />
        <FilterChipRow label="Volledigheid" options={COMPLETENESS_OPTIONS} value={onlyComplete} onChange={setOnlyComplete} />
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Laden...</p>
      ) : (
        <div className="space-y-4">
          <OverallStatsCard players={players} matches={filteredMatches} sessions={filteredSessions} scoreModeFilter={scoreModeFilter} />
          <PopperStatsCard
            players={players}
            sessions={filteredSessions}
            matches={filteredMatches}
            poppers={filteredPoppers}
          />
          <PerformanceChart players={players} sessions={filteredSessions} matches={filteredMatches} scoreModeFilter={scoreModeFilter} />
          <BestDuoCard players={players} matches={filteredMatches} scoreModeFilter={scoreModeFilter} />
          <FairestMatchupCard players={players} matches={filteredMatches} />
          <SessionReplayCard sessions={filteredSessions} players={players} />
        </div>
      )}
    </div>
  )
}
