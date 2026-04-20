import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import SessionListItem from './SessionListItem'
import NewSessionModal from './NewSessionModal'

export default function HomeScreen({ players, onSessionCreated, onSelectSession }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchSessions = useCallback(async () => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setSessions(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleCreated = (session) => {
    setShowModal(false)
    fetchSessions()
    onSessionCreated(session)
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center justify-between mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Haarlemboys</h1>
          <p className="text-primary font-semibold text-sm">Padelapp</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary text-sm"
        >
          + Nieuwe sessie
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Laden...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">🎾</div>
          <p className="font-medium">Nog geen sessies</p>
          <p className="text-sm mt-1">Start je eerste sessie!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <SessionListItem
              key={s.id}
              session={s}
              players={players}
              onClick={() => onSelectSession(s)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewSessionModal
          players={players}
          onCreated={handleCreated}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
