import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, subscribeToSession } from '../../supabaseClient'
import RoundCard from './RoundCard'
import LiveRanking from './LiveRanking'
import ScheduleAccordion from './ScheduleAccordion'
import EditMatchDialog from './EditMatchDialog'
import ConfirmDialog from '../shared/ConfirmDialog'

export default function ActiveSessionScreen({ session, players, onSessionEnd }) {
  const [schedule, setSchedule] = useState([])
  const [matches, setMatches] = useState([])
  const [editData, setEditData] = useState(null) // { match, row }
  const [showStop, setShowStop] = useState(false)
  const [stopping, setStopping] = useState(false)
  const advancingRef = useRef(false)

  const fetchData = useCallback(async () => {
    const [{ data: sch }, { data: mch }] = await Promise.all([
      supabase.from('schedule').select('*').eq('session_id', session.id).order('round_number'),
      supabase.from('matches').select('*').eq('session_id', session.id).order('round_number'),
    ])
    setSchedule(sch ?? [])
    setMatches(mch ?? [])
  }, [session.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const unsub = subscribeToSession(session.id, fetchData)
    return unsub
  }, [session.id, fetchData])

  const tryAdvanceRound = useCallback(async (freshSchedule, freshMatches) => {
    if (advancingRef.current) return
    advancingRef.current = true

    try {
      const currentRows = freshSchedule.filter((r) => r.is_current)
      if (currentRows.length === 0) return

      const allCurrentDone = currentRows.every((row) =>
        freshMatches.some(
          (m) =>
            m.is_completed &&
            m.session_id === session.id &&
            m.round_number === row.round_number &&
            ((m.team1_p1 === row.team1_p1 && m.team1_p2 === row.team1_p2) ||
              (m.team1_p1 === row.team1_p2 && m.team1_p2 === row.team1_p1))
        )
      )

      if (!allCurrentDone) return

      const currentRound = currentRows[0].round_number
      const allRounds = [...new Set(freshSchedule.map((r) => r.round_number))].sort((a, b) => a - b)
      const nextRound = allRounds.find((r) => r > currentRound)

      if (nextRound) {
        await supabase
          .from('schedule')
          .update({ is_current: false })
          .eq('session_id', session.id)
          .eq('round_number', currentRound)
        await supabase
          .from('schedule')
          .update({ is_current: true })
          .eq('session_id', session.id)
          .eq('round_number', nextRound)
        await fetchData()
      } else {
        // All rounds done — end session
        await supabase
          .from('sessions')
          .update({ is_active: false, is_completed: true })
          .eq('id', session.id)
        onSessionEnd({ ...session, is_active: false, is_completed: true })
      }
    } finally {
      advancingRef.current = false
    }
  }, [session, fetchData, onSessionEnd])

  const handleScoreSaved = useCallback(async () => {
    const [{ data: sch }, { data: mch }] = await Promise.all([
      supabase.from('schedule').select('*').eq('session_id', session.id).order('round_number'),
      supabase.from('matches').select('*').eq('session_id', session.id).order('round_number'),
    ])
    const freshSch = sch ?? []
    const freshMch = mch ?? []
    setSchedule(freshSch)
    setMatches(freshMch)
    await tryAdvanceRound(freshSch, freshMch)
  }, [session.id, tryAdvanceRound])

  const handleStop = async () => {
    setStopping(true)
    await supabase
      .from('sessions')
      .update({ is_active: false })
      .eq('id', session.id)
    onSessionEnd({ ...session, is_active: false, is_completed: false })
  }

  const currentRows = schedule.filter((r) => r.is_current)
  const currentRound = currentRows[0]?.round_number ?? null
  const allRounds = [...new Set(schedule.map((r) => r.round_number))].sort((a, b) => a - b)
  const nextRound = currentRound ? allRounds.find((r) => r > currentRound) : null
  const nextRows = nextRound ? schedule.filter((r) => r.round_number === nextRound) : []

  const sessionPlayers = players.filter((p) => session.player_ids.includes(p.id))

  const dateStr = new Date(session.date + 'T12:00:00').toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="max-w-lg mx-auto p-4 pb-36">
      {/* Header */}
      <div className="mb-4">
        <p className="text-xs text-gray-400">{dateStr}</p>
        <p className="text-sm text-gray-600">{sessionPlayers.map((p) => p.name).join(', ')}</p>
      </div>

      {/* Huidige ronde */}
      {currentRows.length > 0 && (
        <RoundCard
          title={`Ronde ${currentRound}`}
          scheduleRows={currentRows}
          session={session}
          players={players}
          matches={matches}
          onScoreSaved={handleScoreSaved}
          onEdit={(match, row) => setEditData({ match, row })}
        />
      )}

      {/* Volgende ronde */}
      {nextRows.length > 0 && (
        <RoundCard
          title={`Volgende ronde (ronde ${nextRound})`}
          scheduleRows={nextRows}
          session={session}
          players={players}
          matches={matches}
          muted
        />
      )}

      {/* Schema accordion */}
      <ScheduleAccordion
        schedule={schedule}
        matches={matches}
        players={players}
        session={session}
      />

      {/* Stop knop */}
      <div className="mt-4">
        <button
          onClick={() => setShowStop(true)}
          className="w-full py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Stop sessie
        </button>
      </div>

      {/* Live ranking */}
      <LiveRanking session={session} players={players} matches={matches} />

      {/* Dialogen */}
      {showStop && (
        <ConfirmDialog
          title="Sessie stoppen?"
          message="De sessie wordt gestopt. De huidige stand wordt bewaard."
          confirmLabel="Stop sessie"
          onConfirm={handleStop}
          onCancel={() => setShowStop(false)}
        />
      )}

      {editData && (
        <EditMatchDialog
          match={editData.match}
          session={session}
          players={players}
          onSaved={() => { setEditData(null); fetchData() }}
          onClose={() => setEditData(null)}
        />
      )}
    </div>
  )
}
