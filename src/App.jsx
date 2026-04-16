import { useState } from 'react'
import SetupScreen from './components/SetupScreen'
import TournamentScreen from './components/TournamentScreen'

export default function App() {
  const [screen, setScreen] = useState('setup') // 'setup' | 'tournament'
  const [players, setPlayers] = useState([])

  const handleStart = (playerNames) => {
    setPlayers(playerNames)
    setScreen('tournament')
  }

  const handleReset = () => {
    setPlayers([])
    setScreen('setup')
  }

  if (screen === 'tournament') {
    return <TournamentScreen initialPlayers={players} onReset={handleReset} />
  }

  return <SetupScreen onStart={handleStart} />
}
