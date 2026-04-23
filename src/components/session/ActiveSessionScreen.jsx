import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, subscribeToSession } from '../../supabaseClient'
import RoundCard from './RoundCard'
import LiveRanking from './LiveRanking'
import ScheduleAccordion from './ScheduleAccordion'
import EditMatchDialog from './EditMatchDialog'
import ConfirmDialog from '../shared/ConfirmDialog'

function NicknameDialog({ session, players, nicknames, onSave, onClose }) {
  const sessionPlayers = players.filter((p) => session.player_ids.includes(p.id))
  const [local, setLocal] = useState({ ...nicknames })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const clean = Object.fromEntries(
      Object.entries(local).filter(([, v]) => v?.trim())
    )
    await supabase.from('sessions').update({ nicknames: clean }).eq('id', session.id)
    onSave(clean)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-gray-900 text-lg mb-4">Bijnamen aanpassen</h3>
        <div className="space-y-3 mb-6">
          {sessionPlayers.map((p) => (
            <div key={p.id}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{p.name}</label>
              <input
                type="text"
                placeholder="Bijnaam (optioneel)"
                value={local[p.id] || ''}
                onChange={(e) => setLocal((prev) => ({ ...prev, [p.id]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Annuleren</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary">
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ActiveSessionScreen({ session, players, onSessionEnd, onBack, editMode, onDoneEditing }) {
  const [schedule, setSchedule] = useState([])
  const [matches, setMatches] = useState([])
  const [editData, setEditData] = useState(null)
  const [showStop, setShowStop] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [nicknames, setNicknames] = useState(session.nicknames ?? {})
  const [showNicknameDialog, setShowNicknameDialog] = useState(false)
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

  const dateStr = new Date(session.date + 'T12:00:00').toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="max-w-lg mx-auto p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-gray-700 transition-colors text-lg leading-none"
              title="Terug naar home"
            >
              ←
            </button>
          )}
          <div>
            <p className="text-xs text-gray-400">{dateStr}</p>
            {session.location && (
              <p className="text-xs text-gray-400">📍 {session.location}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowNicknameDialog(true)}
          className="text-xs text-gray-400 hover:text-primary transition-colors"
        >
          ✏️ Bijnamen
        </button>
      </div>

      {/* Huidige ronde */}
      {currentRows.length > 0 && (
        <RoundCard
          title={`Ronde ${currentRound}`}
          scheduleRows={currentRows}
          session={session}
          players={players}
          matches={matches}
          nicknames={nicknames}
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
          nicknames={nicknames}
          muted
        />
      )}

      {/* Schema accordion */}
      <ScheduleAccordion
        schedule={schedule}
        matches={matches}
        players={players}
        session={session}
        nicknames={nicknames}
        onScoreSaved={handleScoreSaved}
        onEdit={editMode ? (match, row) => setEditData({ match, row }) : undefined}
      />

      {/* Live ranking */}
      <LiveRanking session={session} players={players} matches={matches} nicknames={nicknames} />

      {/* Stop / Klaar-knop */}
      <div className="mt-4">
        {editMode ? (
          <button
            onClick={onDoneEditing}
            className="w-full py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover"
          >
            Klaar met bewerken
          </button>
        ) : (
          <button
            onClick={() => setShowStop(true)}
            className="w-full py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Stop sessie
          </button>
        )}
      </div>

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
          nicknames={nicknames}
          onSaved={() => { setEditData(null); fetchData() }}
          onClose={() => setEditData(null)}
        />
      )}

      {showNicknameDialog && (
        <NicknameDialog
          session={session}
          players={players}
          nicknames={nicknames}
          onSave={(updated) => { setNicknames(updated); setShowNicknameDialog(false) }}
          onClose={() => setShowNicknameDialog(false)}
        />
      )}
    </div>
  )
}
