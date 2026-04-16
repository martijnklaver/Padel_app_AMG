import { useState } from 'react'
import SetupScreen from './components/SetupScreen'
import TournamentScreen from './components/TournamentScreen'
import EndScreen from './components/EndScreen'

export default function App() {
  const [screen, setScreen] = useState('setup') // 'setup' | 'tournament' | 'end'
  const [tournamentData, setTournamentData] = useState(null)

  const handleStart = (data) => {
    setTournamentData(data)
    setScreen('tournament')
  }

  const handleEnd = (finalPlayers) => {
    setTournamentData((prev) => ({ ...prev, finalPlayers }))
    setScreen('end')
  }

  const handleReset = () => {
    setTournamentData(null)
    setScreen('setup')
  }

  if (screen === 'tournament') {
    return (
      <TournamentScreen
        tournamentData={tournamentData}
        onEnd={handleEnd}
      />
    )
  }

  if (screen === 'end') {
    return (
      <EndScreen
        players={tournamentData?.finalPlayers ?? []}
        onReset={handleReset}
      />
    )
  }

  return <SetupScreen onStart={handleStart} />
}
