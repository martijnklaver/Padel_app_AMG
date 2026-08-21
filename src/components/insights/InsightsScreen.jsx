import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { SCORE_MODES } from '../../utils/scoreModes'
import OverallStatsCard from './OverallStatsCard'
import PerformanceChart from './PerformanceChart'
import BestDuoCard from './BestDuoCard'
import FairestMatchupCard from './FairestMatchupCard'
import SessionReplayCard from './SessionReplayCard'
import PopperStatsCard from './PopperStatsCard'

const LIMIT_OPTIONS = [
  { label: 'Alle sessies', value: null },
  { label: 'Laatste 3', value: 3 },
  { label: 'Laatste 5', value: 5 },
  { label: 'Laatste 10', value: 10 },
]

const SCORE_MODE_FILTER_OPTIONS = [
  { label: 'Alle potjes', value: null },
  ...SCORE_MODES.map(({ value, label }) => ({ value, label })),
]

const COMPLETENESS_OPTIONS = [
  { label: 'Alle sessies', value: false },
  { label: 'Alleen volledige sessies', value: true },
]

const SESSION_TYPE_OPTIONS = [
  { label: 'Alle sessies', value: null },
  { label: '5 spelers', value: 5 },
  { label: '4 spelers', value: 4 },
]

function FilterGroup({ label, options, value, onChange }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
              value === opt.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary/40'
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
  const [filtersOpen, setFiltersOpen] = useState(false)

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

  const activeChips = [
    sessionLimit !== null && {
      label: LIMIT_OPTIONS.find((o) => o.value === sessionLimit)?.label,
      reset: () => setSessionLimit(null),
    },
    scoreModeFilter !== null && {
      label: SCORE_MODE_FILTER_OPTIONS.find((o) => o.value === scoreModeFilter)?.label,
      reset: () => setScoreModeFilter(null),
    },
    sessionTypeFilter !== null && {
      label: SESSION_TYPE_OPTIONS.find((o) => o.value === sessionTypeFilter)?.label,
      reset: () => setSessionTypeFilter(null),
    },
    onlyComplete && {
      label: 'Alleen volledig',
      reset: () => setOnlyComplete(false),
    },
  ].filter(Boolean)

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

      {/* Per sessie terugkijken — bovenaan, niet onderaan verstopt */}
      {!loading && (
        <div className="mb-5">
          <SessionReplayCard sessions={filteredSessions} players={players} />
        </div>
      )}

      {/* Filters */}
      <div className="mb-5">
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-primary transition-colors"
        >
          🔧 Filters <span className="text-xs">{filtersOpen ? '▲' : '▼'}</span>
        </button>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {activeChips.map((chip, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
              >
                {chip.label}
                <button
                  onClick={chip.reset}
                  className="font-bold leading-none hover:text-primary-hover"
                  title="Filter resetten"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {filtersOpen && (
          <div className="mt-3 bg-white border border-gray-100 rounded-2xl p-4">
            <FilterGroup label="Toon inzichten over:" options={LIMIT_OPTIONS} value={sessionLimit} onChange={setSessionLimit} />
            <FilterGroup label="Score modus:" options={SCORE_MODE_FILTER_OPTIONS} value={scoreModeFilter} onChange={setScoreModeFilter} />
            <FilterGroup label="Aantal spelers:" options={SESSION_TYPE_OPTIONS} value={sessionTypeFilter} onChange={setSessionTypeFilter} />
            <FilterGroup label="Volledigheid:" options={COMPLETENESS_OPTIONS} value={onlyComplete} onChange={setOnlyComplete} />
          </div>
        )}
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
        </div>
      )}
    </div>
  )
}
