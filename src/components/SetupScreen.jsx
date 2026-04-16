import { useState } from 'react'

export default function SetupScreen({ onStart }) {
  const [inputValue, setInputValue] = useState('')
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')

  const addPlayer = () => {
    const name = inputValue.trim()
    if (!name) return
    if (players.length >= 12) {
      setError('Maximaal 12 spelers toegestaan.')
      return
    }
    if (players.some((p) => p.toLowerCase() === name.toLowerCase())) {
      setError('Deze naam bestaat al.')
      return
    }
    setPlayers((prev) => [...prev, name])
    setInputValue('')
    setError('')
  }

  const removePlayer = (index) => {
    setPlayers((prev) => prev.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addPlayer()
  }

  const canStart = players.length >= 6

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-light mb-4">
          <span className="text-3xl">🎾</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Padel Americano</h1>
        <p className="text-gray-500 mt-1">Voeg spelers toe om te beginnen</p>
      </div>

      {/* Input */}
      <div className="w-full max-w-md card mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Spelersnaam
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setError('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="Naam invoeren..."
            maxLength={30}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:border-primary transition-colors"
          />
          <button onClick={addPlayer} className="btn-primary text-sm px-5">
            Toevoegen
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>

      {/* Player chips */}
      {players.length > 0 && (
        <div className="w-full max-w-md card mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Spelers ({players.length}/12)
          </p>
          <div className="flex flex-wrap gap-2">
            {players.map((name, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-primary-light text-primary
                           font-medium text-sm px-3 py-1 rounded-full"
              >
                {name}
                <button
                  onClick={() => removePlayer(i)}
                  className="ml-1 text-primary hover:text-primary-hover leading-none"
                  aria-label={`Verwijder ${name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          {players.length < 6 && (
            <p className="text-xs text-gray-400 mt-3">
              Voeg nog {6 - players.length} speler(s) toe om te starten.
            </p>
          )}
        </div>
      )}

      <button
        onClick={() => onStart(players)}
        disabled={!canStart}
        className="btn-primary w-full max-w-md py-3 text-base"
      >
        Start Toernooi
      </button>
    </div>
  )
}
