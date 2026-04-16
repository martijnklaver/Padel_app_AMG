import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { generateSchedule, getRecommendedMatches } from '../utils/tournament'

export default function SetupScreen({ onStart }) {
  const [inputValue, setInputValue] = useState('')
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [numCourts, setNumCourts] = useState(1)
  const [matchesPerPlayer, setMatchesPerPlayer] = useState(1)
  const [pointsPerMatch, setPointsPerMatch] = useState(12)
  const [starting, setStarting] = useState(false)

  const maxCourts = Math.max(1, Math.floor(players.length / 4))
  const roundsTotal =
    players.length >= 4
      ? Math.ceil((matchesPerPlayer * players.length) / (4 * numCourts))
      : 0

  // Keep numCourts within bounds when player count changes
  useEffect(() => {
    if (numCourts > maxCourts) setNumCourts(maxCourts)
  }, [players.length, maxCourts])

  // Update matchesPerPlayer to recommended value when courts or player count changes
  useEffect(() => {
    if (players.length >= 4) {
      setMatchesPerPlayer(getRecommendedMatches(players.length, numCourts))
    }
  }, [players.length, numCourts])

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

  const handleStart = async () => {
    if (players.length < 6 || starting) return
    setStarting(true)
    setError('')

    try {
      // 1. Clear any existing data
      await supabase.from('schedule').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('tournament_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // 2. Insert players
      const { data: insertedPlayers, error: pErr } = await supabase
        .from('players')
        .insert(players.map((name) => ({ name })))
        .select()

      if (pErr) throw pErr

      // 3. Generate full schedule
      const { schedule, roundsTotal: rt } = generateSchedule(
        insertedPlayers,
        numCourts,
        matchesPerPlayer
      )

      // 4. Build schedule rows for Supabase
      const scheduleRows = []
      for (const { round, courts } of schedule) {
        for (const court of courts) {
          scheduleRows.push({
            round_number: round,
            court_number: court.court,
            team1_p1: court.team1_p1.id,
            team1_p2: court.team1_p2.id,
            team2_p1: court.team2_p1.id,
            team2_p2: court.team2_p2.id,
            warning: court.warning ?? null,
            is_current: round === 1,
            is_completed: false,
          })
        }
      }

      const { error: sErr } = await supabase.from('schedule').insert(scheduleRows)
      if (sErr) throw sErr

      // 5. Insert tournament settings
      const { data: settings, error: tErr } = await supabase
        .from('tournament_settings')
        .insert({
          points_per_match: pointsPerMatch,
          num_courts: numCourts,
          rounds_total: rt,
          is_active: true,
        })
        .select()
        .single()

      if (tErr) throw tErr

      onStart({ players: insertedPlayers, settings })
    } catch (err) {
      console.error(err)
      setError('Er ging iets mis: ' + err.message)
      setStarting(false)
    }
  }

  const canStart = players.length >= 6 && !starting

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

      {/* Player input */}
      <div className="w-full max-w-md card mb-4">
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
        <div className="w-full max-w-md card mb-4">
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

      {/* Settings */}
      {players.length >= 4 && (
        <div className="w-full max-w-md card mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-4">Instellingen</p>

          <div className="space-y-4">
            <SettingRow
              label="Aantal banen"
              value={numCourts}
              min={1}
              max={maxCourts}
              onChange={setNumCourts}
            />
            <SettingRow
              label="Wedstrijden per speler"
              value={matchesPerPlayer}
              min={1}
              max={10}
              onChange={setMatchesPerPlayer}
            />
            <SettingRow
              label="Punten per wedstrijd"
              value={pointsPerMatch}
              min={6}
              max={21}
              onChange={setPointsPerMatch}
            />
          </div>

          {/* Live preview */}
          {players.length >= 6 && roundsTotal > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl text-sm text-gray-600 leading-relaxed">
              Met <strong>{players.length}</strong> spelers,{' '}
              <strong>{numCourts}</strong> {numCourts === 1 ? 'baan' : 'banen'} en{' '}
              <strong>{matchesPerPlayer}</strong> wedstrijden per speler zijn er{' '}
              <strong>{roundsTotal}</strong> rondes totaal.
              <br />
              Elke speler speelt <strong>{matchesPerPlayer}</strong> of{' '}
              <strong>{matchesPerPlayer + 1}</strong> wedstrijden.
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={!canStart}
        className="btn-primary w-full max-w-md py-3 text-base"
      >
        {starting ? 'Bezig met starten...' : 'Start Toernooi'}
      </button>
    </div>
  )
}

function SettingRow({ label, value, min, max, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center
                     text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed
                     font-bold text-lg leading-none"
        >
          −
        </button>
        <span className="w-6 text-center font-semibold text-gray-900">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center
                     text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed
                     font-bold text-lg leading-none"
        >
          +
        </button>
      </div>
    </div>
  )
}
