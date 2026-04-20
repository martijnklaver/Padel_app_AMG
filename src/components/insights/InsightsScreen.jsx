import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import BestPlayerCard from './BestPlayerCard'
import BestDuoCard from './BestDuoCard'
import FairestMatchupCard from './FairestMatchupCard'
import SessionReplayCard from './SessionReplayCard'

export default function InsightsScreen({ players }) {
  const [matches, setMatches] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="max-w-lg mx-auto p-4">
      <h2 className="text-xl font-bold text-gray-900 mb-5 pt-2">Inzichten</h2>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Laden...</p>
      ) : (
        <div className="space-y-4">
          <BestPlayerCard players={players} matches={matches} />
          <BestDuoCard players={players} matches={matches} />
          <FairestMatchupCard players={players} matches={matches} />
          <SessionReplayCard sessions={sessions} players={players} />
        </div>
      )}
    </div>
  )
}
