import { useState, useEffect, useCallback } from 'react'
import { supabase, syncAchievements } from '../../supabaseClient'
import { SCORE_MODES } from '../../utils/scoreModes'
import OverallStatsCard from './OverallStatsCard'
import PerformanceChart from './PerformanceChart'
import BestDuoCard from './BestDuoCard'
import FairestMatchupCard from './FairestMatchupCard'
import SessionReplayCard from './SessionReplayCard'
import PopperStatsCard from './PopperStatsCard'
import AchievementsCard from './AchievementsCard'

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

export default function InsightsScreen({ players, onBack }) {
  const [matches, setMatches] = useState([])
  const [sessions, setSessions] = useState([])
  const [poppers, setPoppers] = useState([])
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [sessionLimit, setSessionLimit] = useState(null)
  const [scoreModeFilter, setScoreModeFilter] = useState(null)
  const [onlyComplete, setOnlyComplete] = useState(false)
  const [sessionTypeFilter, setSessionTypeFilter] = useState(null)

  const fetchData = useCallback(async () => {
    const [{ data: allMatches }, { data: allSessions }, { data: allPoppers }, { data: allAchievements }] = await Promise.all([
      supabase.from('matches').select('*').eq('is_completed', true),
      supabase.from('sessions').select('*').order('date', { ascending: false }),
      supabase.from('poppers').select('*'),
      supabase.from('achievements').select('*'),
    ])
    setMatches(allMatches ?? [])
    setSessions(allSessions ?? [])
    setPoppers(allPoppers ?? [])
    setAchievements(allAchievements ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Vangnet: backfilt achievements uit de volledige historie (bijv. voor sessies die
  // al afgerond waren voordat dit systeem bestond), zodat je niet op een nieuwe
  // sessie hoeft te wachten om oude badges te zien.
  useEffect(() => {
    if (players.length === 0) return
    syncAchievements(players).then((newly) => {
      if (newly.length > 0) fetchData()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length])

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

      {/* Score modus filter */}
      <div className="mb-5">
        <p className="text-xs text-gray-500 mb-2">Score modus:</p>
        <div className="flex flex-wrap gap-1.5">
          {SCORE_MODE_FILTER_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setScoreModeFilter(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                scoreModeFilter === opt.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aantal spelers filter (sessieniveau) */}
      <div className="mb-5">
        <p className="text-xs text-gray-500 mb-2">Aantal spelers:</p>
        <div className="flex flex-wrap gap-1.5">
          {SESSION_TYPE_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setSessionTypeFilter(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                sessionTypeFilter === opt.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Volledigheid filter */}
      <div className="mb-5">
        <p className="text-xs text-gray-500 mb-2">Volledigheid:</p>
        <div className="flex flex-wrap gap-1.5">
          {COMPLETENESS_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setOnlyComplete(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                onlyComplete === opt.value
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
          <AchievementsCard players={players} achievements={achievements} />
          <OverallStatsCard players={players} matches={filteredMatches} scoreModeFilter={scoreModeFilter} />
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
