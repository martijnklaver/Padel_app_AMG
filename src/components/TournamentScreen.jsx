import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { pickNextMatch } from '../utils/tournament'
import ScoreInput from './ScoreInput'
import BenchDisplay from './BenchDisplay'
import MatchHistory from './MatchHistory'
import RankingFooter from './RankingFooter'

export default function TournamentScreen({ initialPlayers, onReset }) {
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [currentMatch, setCurrentMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  // Ref to hold latest players/matches for refreshData without stale closure
  const stateRef = useRef({ players: [], matches: [] })

  useEffect(() => {
    stateRef.current = { players, matches }
  }, [players, matches])

  // ── Bootstrap: insert players & create first pending match ──
  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      const inserts = initialPlayers.map((name) => ({ name }))
      const { data: inserted, error: pErr } = await supabase
        .from('players')
        .insert(inserts)
        .select()

      if (pErr || !inserted || cancelled) {
        console.error(pErr)
        return
      }

      const pending = pickNextMatch(inserted, [])
      let matchWithId = null

      if (pending) {
        matchWithId = await createPendingMatch(pending)
      }

      if (!cancelled) {
        setPlayers(inserted)
        setMatches([])
        setCurrentMatch(matchWithId ?? pending)
        setLoading(false)
      }
    }

    bootstrap()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helper: insert a pending (not completed) match row ──────
  const createPendingMatch = async (matchPick) => {
    const { data, error } = await supabase
      .from('matches')
      .insert({
        team1_p1: matchPick.team1[0].id,
        team1_p2: matchPick.team1[1].id,
        team2_p1: matchPick.team2[0].id,
        team2_p2: matchPick.team2[1].id,
        is_completed: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Could not create pending match:', error)
      return matchPick // fall back without a DB id
    }

    return { ...matchPick, id: data.id }
  }

  // ── Realtime subscription ───────────────────────────────────
  useEffect(() => {
    if (players.length === 0) return

    const channel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => refreshData()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [players.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refresh all data from DB ────────────────────────────────
  const refreshData = useCallback(async () => {
    const { players: latestPlayers } = stateRef.current
    if (latestPlayers.length === 0) return

    const playerIds = latestPlayers.map((p) => p.id)

    const [{ data: updatedPlayers }, { data: updatedMatches }] = await Promise.all([
      supabase.from('players').select('*').in('id', playerIds),
      supabase
        .from('matches')
        .select('*')
        .or(
          playerIds.map((id) => `team1_p1.eq.${id}`).join(',') + ',' +
          playerIds.map((id) => `team1_p2.eq.${id}`).join(',') + ',' +
          playerIds.map((id) => `team2_p1.eq.${id}`).join(',') + ',' +
          playerIds.map((id) => `team2_p2.eq.${id}`).join(',')
        )
        .order('created_at', { ascending: false }),
    ])

    const freshPlayers = updatedPlayers ?? latestPlayers
    const freshMatches = updatedMatches ?? []

    setPlayers(freshPlayers)
    setMatches(freshMatches)

    // Build next match from fresh data
    const completedMatches = freshMatches.filter((m) => m.is_completed)
    const pending = pickNextMatch(freshPlayers, completedMatches)

    if (pending) {
      const matchWithId = await createPendingMatch(pending)
      setCurrentMatch(matchWithId)
    } else {
      setCurrentMatch(null)
    }
  }, []) // createPendingMatch is stable

  const handleMatchSaved = () => refreshData()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Toernooi starten...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-64">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎾</span>
          <span className="font-bold text-gray-900">Padel toernooi AMG</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Nieuw toernooi
        </button>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {currentMatch ? (
          <>
            <ScoreInput match={currentMatch} onSaved={handleMatchSaved} />
            <BenchDisplay benchPlayers={currentMatch.bench} />
          </>
        ) : (
          <div className="card text-center py-10">
            <span className="text-4xl">🏆</span>
            <p className="text-gray-700 font-semibold mt-3">Toernooi voltooid!</p>
            <p className="text-gray-400 text-sm mt-1">Bekijk de eindstand hieronder.</p>
          </div>
        )}

        <MatchHistory matches={matches} players={players} />
      </div>

      <RankingFooter players={players} />
    </div>
  )
}
