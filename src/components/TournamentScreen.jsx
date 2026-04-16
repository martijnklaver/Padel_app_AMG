import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, subscribeToAll } from '../supabaseClient'
import ScoreInput from './ScoreInput'
import BenchDisplay from './BenchDisplay'
import RankingFooter from './RankingFooter'
import ScheduleView from './ScheduleView'

export default function TournamentScreen({ tournamentData, onEnd }) {
  const [schedule, setSchedule] = useState([])
  const [players, setPlayers] = useState(tournamentData?.players ?? [])
  const [settings, setSettings] = useState(tournamentData?.settings ?? null)
  const [loading, setLoading] = useState(true)
  const [showStopDialog, setShowStopDialog] = useState(false)
  const playerIdsRef = useRef(tournamentData?.players?.map((p) => p.id) ?? [])

  const fetchData = useCallback(async () => {
    const ids = playerIdsRef.current
    if (ids.length === 0) return

    const [{ data: freshPlayers }, { data: freshSchedule }, { data: freshSettings }] =
      await Promise.all([
        supabase.from('players').select('*').in('id', ids),
        supabase.from('schedule').select('*').in('team1_p1', ids).order('round_number').order('court_number'),
        supabase.from('tournament_settings').select('*').eq('is_active', true).single(),
      ])

    if (freshPlayers) setPlayers(freshPlayers)
    if (freshSchedule) setSchedule(freshSchedule)
    if (freshSettings) setSettings(freshSettings)
  }, [])

  // Initial load
  useEffect(() => {
    fetchData().then(() => setLoading(false))
  }, [fetchData])

  // Realtime subscription
  useEffect(() => {
    const unsub = subscribeToAll(fetchData)
    return unsub
  }, [fetchData])

  // After a score is saved: check if round is complete → advance or end
  const handleScoreSaved = useCallback(async () => {
    const ids = playerIdsRef.current
    const { data: freshSchedule } = await supabase
      .from('schedule')
      .select('*')
      .in('team1_p1', ids)
      .order('round_number')
      .order('court_number')

    if (!freshSchedule) return

    setSchedule(freshSchedule)

    const currentRows = freshSchedule.filter((r) => r.is_current)
    if (currentRows.length === 0) return

    const allDone = currentRows.every((r) => r.is_completed)
    if (!allDone) return

    const currentRound = currentRows[0].round_number
    const nextRows = freshSchedule.filter((r) => r.round_number === currentRound + 1)

    if (nextRows.length === 0) {
      // Tournament over — fetch final player stats
      const { data: finalPlayers } = await supabase
        .from('players')
        .select('*')
        .in('id', ids)

      // Deactivate settings
      if (settings?.id) {
        await supabase
          .from('tournament_settings')
          .update({ is_active: false })
          .eq('id', settings.id)
      }

      onEnd(finalPlayers ?? players)
      return
    }

    // Advance to next round
    await supabase
      .from('schedule')
      .update({ is_current: false })
      .eq('round_number', currentRound)
      .in('team1_p1', ids)

    await supabase
      .from('schedule')
      .update({ is_current: true })
      .eq('round_number', currentRound + 1)
      .in('team1_p1', ids)

    // Re-fetch after advancing
    fetchData()
  }, [fetchData, onEnd, players, settings])

  const handleStop = async () => {
    const { data: finalPlayers } = await supabase
      .from('players')
      .select('*')
      .in('id', playerIdsRef.current)

    if (settings?.id) {
      await supabase
        .from('tournament_settings')
        .update({ is_active: false })
        .eq('id', settings.id)
    }

    onEnd(finalPlayers ?? players)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Toernooi laden...</p>
        </div>
      </div>
    )
  }

  const currentRows = schedule.filter((r) => r.is_current)
  const currentRound = currentRows.length > 0 ? currentRows[0].round_number : null
  const nextRoundNum = currentRound ? currentRound + 1 : null
  const nextRows = nextRoundNum
    ? schedule.filter((r) => r.round_number === nextRoundNum)
    : []

  // Bench: players not playing in current round
  const playingIds = new Set(
    currentRows.flatMap((r) => [r.team1_p1, r.team1_p2, r.team2_p1, r.team2_p2])
  )
  const benchPlayers = players.filter((p) => !playingIds.has(p.id))

  // Bench for next round
  const nextPlayingIds = new Set(
    nextRows.flatMap((r) => [r.team1_p1, r.team1_p2, r.team2_p1, r.team2_p2])
  )
  const nextBenchPlayers = players.filter((p) => !nextPlayingIds.has(p.id))

  const name = (id) => players.find((p) => p.id === id)?.name ?? '?'
  const pointsPerMatch = settings?.points_per_match ?? 12

  return (
    <div className="min-h-screen pb-64">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎾</span>
          <span className="font-bold text-gray-900">Padel Americano</span>
          {currentRound && (
            <span className="text-xs text-gray-400 ml-1">
              Ronde {currentRound}{settings?.rounds_total ? ` / ${settings.rounds_total}` : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowStopDialog(true)}
          className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
        >
          Stop Toernooi
        </button>
      </div>

      {/* Stop confirmation dialog */}
      {showStopDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="font-semibold text-gray-900 mb-2">Toernooi stoppen?</p>
            <p className="text-sm text-gray-500 mb-6">
              Weet je zeker dat je het toernooi wilt stoppen?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStopDialog(false)}
                className="btn-secondary flex-1"
              >
                Annuleren
              </button>
              <button
                onClick={handleStop}
                className="flex-1 bg-red-500 text-white font-semibold px-4 py-2 rounded-lg
                           hover:bg-red-600 active:scale-95 transition-all duration-150"
              >
                Stoppen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Current round */}
        {currentRows.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              Huidige ronde — Ronde {currentRound}
            </p>
            {currentRows
              .filter((r) => !r.is_completed)
              .map((row) => (
                <div key={row.id} className="mb-3">
                  <ScoreInput
                    scheduleRow={row}
                    players={players}
                    pointsPerMatch={pointsPerMatch}
                    courtNumber={row.court_number}
                    onSaved={handleScoreSaved}
                  />
                </div>
              ))}

            {/* Already completed courts in current round */}
            {currentRows.filter((r) => r.is_completed).map((row) => (
              <div key={row.id} className="card mb-3 opacity-60">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs text-gray-400">Baan {row.court_number}:</span>
                  <span className="text-gray-700">
                    {name(row.team1_p1)} & {name(row.team1_p2)}
                    <span className="mx-2 font-mono font-bold text-primary">
                      {row.score_team1}–{row.score_team2}
                    </span>
                    {name(row.team2_p1)} & {name(row.team2_p2)}
                  </span>
                  <span className="text-green-500 ml-2">✓</span>
                </div>
              </div>
            ))}

            <BenchDisplay benchPlayers={benchPlayers} />
          </div>
        )}

        {/* Next round */}
        {nextRows.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Volgende ronde — Ronde {nextRoundNum}
            </p>
            <div className="card space-y-2">
              {nextRows.map((row) => (
                <div key={row.id} className="text-sm text-gray-600">
                  <span className="text-gray-400 text-xs">Baan {row.court_number}: </span>
                  {name(row.team1_p1)} & {name(row.team1_p2)}
                  <span className="text-gray-400 mx-1">vs</span>
                  {name(row.team2_p1)} & {name(row.team2_p2)}
                  {row.warning && (
                    <span className="ml-1 text-xs text-amber-500">{row.warning}</span>
                  )}
                </div>
              ))}
              {nextBenchPlayers.length > 0 && (
                <p className="text-xs text-gray-400 pt-1">
                  Bank: {nextBenchPlayers.map((p) => p.name).join(', ')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Full schedule */}
        <ScheduleView
          schedule={schedule}
          players={players}
          currentRound={currentRound}
        />
      </div>

      <RankingFooter players={players} />
    </div>
  )
}
