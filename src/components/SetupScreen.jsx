import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { generateSchedule, getDefaultTotalMatches } from '../utils/tournament'

function isFair(totalMatches, numPlayers) {
  return (totalMatches * 4) % numPlayers === 0
}

function nearestFair(totalMatches, numPlayers) {
  let lower = totalMatches - 1
  while (lower >= 1 && (lower * 4) % numPlayers !== 0) lower--
  let higher = totalMatches + 1
  while (higher <= totalMatches + numPlayers && (higher * 4) % numPlayers !== 0) higher++
  return { lower: lower >= 1 ? lower : null, higher }
}

export default function SetupScreen({ onStart }) {
  const [inputValue, setInputValue] = useState('')
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [numCourts, setNumCourts] = useState(1)
  const [totalMatches, setTotalMatches] = useState(1)
  const [pointsPerMatch, setPointsPerMatch] = useState(12)
  const [starting, setStarting] = useState(false)
  const [showUnfairWarning, setShowUnfairWarning] = useState(false)

  const maxCourts = Math.max(1, Math.floor(players.length / 4))
  const roundsTotal = Math.ceil(totalMatches / numCourts)
  const avgMatchesPerPlayer =
    players.length > 0 ? ((totalMatches * 4) / players.length).toFixed(1) : 0

  // Keep numCourts within bounds when player count changes
  useEffect(() => {
    if (numCourts > maxCourts) setNumCourts(maxCourts)
  }, [players.length, maxCourts])

  // Reset totalMatches to a sensible default when players or courts change
  useEffect(() => {
    if (players.length >= 4) {
      setTotalMatches(getDefaultTotalMatches(players.length, numCourts))
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

  const handleStartClick = () => {
    if (players.length < 6 || starting) return
    if (!isFair(totalMatches, players.length)) {
      setShowUnfairWarning(true)
    } else {
      handleStart()
    }
  }

  const handleStart = async () => {
    setShowUnfairWarning(false)
    setStarting(true)
    setError('')

    try {
      const dummy = '00000000-0000-0000-0000-000000000000'
      await supabase.from('schedule').delete().neq('id', dummy)
      await supabase.from('tournament_settings').delete().neq('id', dummy)
      await supabase.from('matches').delete().neq('id', dummy)
      await supabase.from('players').delete().neq('id', dummy)

      const { data: insertedPlayers, error: pErr } = await supabase
        .from('players')
        .insert(players.map((name) => ({ name })))
        .select()

      if (pErr) throw pErr

      const { schedule, roundsTotal: rt } = generateSchedule(
        insertedPlayers,
        numCourts,
        totalMatches
      )

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

  const fair = players.length >= 4 && isFair(totalMatches, players.length)
  const { lower, higher } =
    players.length >= 4 && !fair
      ? nearestFair(totalMatches, players.length)
      : { lower: null, higher: null }

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

            {/* Total matches with fairness check */}
            <div>
              <EditableSettingRow
                label="Totaal aantal wedstrijden"
                value={totalMatches}
                min={1}
                onChange={setTotalMatches}
              />
              <div className="mt-2 ml-0">
                {fair ? (
                  <p className="text-sm text-green-600">
                    ✅ Elke speler speelt{' '}
                    <strong>{(totalMatches * 4) / players.length}</strong> wedstrijden
                  </p>
                ) : (
                  <div>
                    <p className="text-sm text-amber-600">
                      ⚠️ Niet iedereen speelt evenveel wedstrijden.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Dichtstbijzijnde eerlijke aantallen:
                    </p>
                    <div className="flex gap-2 mt-1">
                      {lower !== null && (
                        <button
                          onClick={() => setTotalMatches(lower)}
                          className="px-3 py-1 rounded-full border border-amber-300 text-amber-700
                                     text-xs font-semibold hover:bg-amber-50 transition-colors"
                        >
                          {lower}
                        </button>
                      )}
                      <button
                        onClick={() => setTotalMatches(higher)}
                        className="px-3 py-1 rounded-full border border-amber-300 text-amber-700
                                   text-xs font-semibold hover:bg-amber-50 transition-colors"
                      >
                        {higher}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <EditableSettingRow
              label="Punten per wedstrijd"
              value={pointsPerMatch}
              min={1}
              max={99}
              onChange={setPointsPerMatch}
            />
          </div>

          {/* Live preview */}
          {players.length >= 6 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl text-sm text-gray-600 leading-relaxed">
              Met <strong>{players.length}</strong> spelers,{' '}
              <strong>{numCourts}</strong> {numCourts === 1 ? 'baan' : 'banen'} en{' '}
              <strong>{totalMatches}</strong> wedstrijden totaal zijn er{' '}
              <strong>{roundsTotal}</strong> rondes.
              <br />
              Elke speler speelt ongeveer <strong>{avgMatchesPerPlayer}</strong> wedstrijden.
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleStartClick}
        disabled={players.length < 6 || starting}
        className="btn-primary w-full max-w-md py-3 text-base"
      >
        {starting ? 'Bezig met starten...' : 'Start Toernooi'}
      </button>

      {/* Unfair distribution confirmation dialog */}
      {showUnfairWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-xl mb-1">⚠️</p>
            <p className="font-semibold text-gray-900 mb-2">Oneerlijke verdeling</p>
            <p className="text-sm text-gray-500 mb-6">
              Niet iedereen speelt evenveel wedstrijden. Wil je toch starten?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnfairWarning(false)}
                className="btn-secondary flex-1"
              >
                Annuleren
              </button>
              <button onClick={handleStart} className="btn-primary flex-1">
                Toch starten
              </button>
            </div>
          </div>
        </div>
      )}
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

function EditableSettingRow({ label, value, min, max, onChange }) {
  const clamp = (v) => {
    if (isNaN(v)) return min
    if (v < min) return min
    if (max !== undefined && v > max) return max
    return v
  }
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center
                     text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed
                     font-bold text-lg leading-none"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))}
          className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm
                     font-semibold focus:outline-none focus:border-primary transition-colors"
        />
        <button
          onClick={() => onChange(clamp(value + 1))}
          disabled={max !== undefined && value >= max}
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
