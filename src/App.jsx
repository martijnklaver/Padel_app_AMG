import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import SetupScreen from './components/SetupScreen'
import TournamentScreen from './components/TournamentScreen'
import EndScreen from './components/EndScreen'

export default function App() {
  const [screen, setScreen] = useState('loading') // 'loading' | 'setup' | 'tournament' | 'end'
  const [tournamentData, setTournamentData] = useState(null)
  // Stored separately so Realtime can never wipe it
  const [finalStandings, setFinalStandings] = useState(null)
  const [allUniquePlayed, setAllUniquePlayed] = useState(false)

  const checkActive = useCallback(async () => {
    const { data } = await supabase
      .from('tournament_settings')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (data) {
      const { data: players } = await supabase.from('players').select('*')
      setTournamentData({ players: players ?? [], settings: data })
      setScreen('tournament')
    } else {
      setScreen((cur) => (cur === 'loading' || cur === 'tournament' ? 'setup' : cur))
    }
  }, [])

  // Check on mount
  useEffect(() => {
    checkActive()
  }, [checkActive])

  // Realtime: navigate when tournament starts or stops on any device
  useEffect(() => {
    const channel = supabase
      .channel('app-settings-watch')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_settings' },
        (payload) => {
          if (payload.new?.is_active === true) {
            checkActive()
          } else {
            // Don't touch the end screen or finalStandings —
            // only navigate away from non-end screens
            setScreen((cur) => (cur === 'end' ? cur : 'setup'))
            setTournamentData(null)
          }
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [checkActive])

  const handleStart = (data) => {
    setTournamentData(data)
    setScreen('tournament')
  }

  const handleEnd = (finalPlayers, allUnique = false) => {
    // Save to dedicated state before is_active is set to false
    // so Realtime can never overwrite it
    setFinalStandings(finalPlayers)
    setAllUniquePlayed(allUnique)
    setScreen('end')
  }

  const handleReset = () => {
    setFinalStandings(null)
    setAllUniquePlayed(false)
    setTournamentData(null)
    setScreen('setup')
  }

  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Laden...</p>
        </div>
      </div>
    )
  }

  if (screen === 'tournament') {
    return (
      <TournamentScreen
        tournamentData={tournamentData}
        onEnd={handleEnd}
        onReset={handleReset}
      />
    )
  }

  if (screen === 'end') {
    return (
      <EndScreen
        players={finalStandings ?? []}
        onReset={handleReset}
        allUniquePlayed={allUniquePlayed}
      />
    )
  }

  return <SetupScreen onStart={handleStart} />
}
