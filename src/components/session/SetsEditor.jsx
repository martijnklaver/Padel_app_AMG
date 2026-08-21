import { useEffect, useState } from 'react'
import { summarizeSetDetails } from '../../utils/tournament'

function toSetDetails(entries) {
  return entries.map((e, i) => {
    if (e.type === 'supertiebreak') {
      const w = parseInt(e.s1) > parseInt(e.s2) ? 1 : 2
      return { supertiebreak: true, team1: w === 1 ? 1 : 0, team2: w === 2 ? 1 : 0 }
    }
    if (e.s1 === '6' && e.s2 === '6') {
      const w = e.tiebreakWinner
      return { set: i + 1, team1: w === 1 ? 7 : 6, team2: w === 2 ? 7 : 6, tiebreak: true }
    }
    return { set: i + 1, team1: parseInt(e.s1), team2: parseInt(e.s2), tiebreak: false }
  })
}

function entriesFromSetDetails(setDetails) {
  if (!setDetails?.length) return [{ type: 'set', s1: '', s2: '', tiebreakWinner: null }]
  return setDetails.map((s) =>
    s.supertiebreak
      ? { type: 'supertiebreak', s1: String(s.team1 === 1 ? 1 : 0), s2: String(s.team2 === 1 ? 1 : 0) }
      : s.tiebreak
        ? { type: 'set', s1: '6', s2: '6', tiebreakWinner: s.team1 > s.team2 ? 1 : 2 }
        : { type: 'set', s1: String(s.team1), s2: String(s.team2), tiebreakWinner: null }
  )
}

const majorityFor = (setsFormat) => Math.floor(setsFormat / 2) + 1

// Games & Sets — invoer voor 4-spelers wedstrijden: één wedstrijd, meerdere sets.
// Bij 6-6 in een set verschijnt automatisch de tiebreak-keuze (winnaar telt, de set
// wordt geregistreerd als 7-6). Bij gelijke stand na de helft van het setsformaat
// kan de beslissende set of een supertiebreak worden gespeeld.
export default function SetsEditor({ setsFormat, initialSetDetails, onChange }) {
  const [entries, setEntries] = useState(() => entriesFromSetDetails(initialSetDetails))

  const update = (next) => setEntries(next)

  const updateField = (i, field, value) => {
    update(entries.map((e, idx) => {
      if (idx !== i) return e
      const next = { ...e, [field]: value }
      if ((field === 's1' || field === 's2') && !(next.s1 === '6' && next.s2 === '6')) {
        next.tiebreakWinner = null
      }
      return next
    }))
  }

  const removeLast = () => {
    if (entries.length <= 1) return
    update(entries.slice(0, -1))
  }

  const addEntry = (type) => {
    update([...entries, { type, s1: '', s2: '', tiebreakWinner: null }])
  }

  const isFilled = (e) => {
    if (e.type === 'set' && e.s1 === '6' && e.s2 === '6') return e.tiebreakWinner != null
    return e.s1 !== '' && e.s2 !== '' && !isNaN(parseInt(e.s1)) && !isNaN(parseInt(e.s2)) && parseInt(e.s1) !== parseInt(e.s2)
  }

  const lastEntry = entries[entries.length - 1]
  const lastFilled = isFilled(lastEntry)

  const completeSetDetails = entries.every(isFilled) ? toSetDetails(entries) : null
  const summary = completeSetDetails ? summarizeSetDetails(completeSetDetails) : null
  const majority = majorityFor(setsFormat)
  // Een supertiebreak beslist altijd de hele wedstrijd, ook als het setsaantal
  // daarmee nog geen meerderheid haalt (bijv. 2-1 in sets na een vroege supertiebreak in best-of-5)
  const hasSupertiebreak = entries.some((e) => e.type === 'supertiebreak')
  const decided = summary
    ? summary.setsWon1 >= majority || summary.setsWon2 >= majority || hasSupertiebreak
    : false
  const tied = summary ? summary.setsWon1 === summary.setsWon2 : false

  const regularSetsPlayed = entries.filter((e) => e.type === 'set').length
  const canAddMore = lastFilled && !decided && regularSetsPlayed < setsFormat

  useEffect(() => {
    if (decided && completeSetDetails) {
      const winner = summary.setsWon1 > summary.setsWon2 ? 1 : 2
      onChange({
        setDetails: completeSetDetails,
        score_team1: summary.team1Games,
        score_team2: summary.team2Games,
        winner,
        normalized_score_team1: winner === 1 ? 1.0 : 0.0,
        normalized_score_team2: winner === 2 ? 1.0 : 0.0,
      })
    } else {
      onChange(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(entries)])

  return (
    <div className="space-y-2">
      {entries.map((e, i) => {
        const inTiebreak = e.type === 'set' && e.s1 === '6' && e.s2 === '6'
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-24 text-xs font-medium text-gray-500 shrink-0">
                {e.type === 'supertiebreak' ? 'Supertiebreak' : `Set ${i + 1}`}
              </span>
              <input
                type="number"
                min="0"
                value={e.s1}
                onChange={(ev) => updateField(i, 's1', ev.target.value)}
                placeholder="0"
                className="w-12 h-9 text-sm font-bold text-center border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
              <span className="text-gray-300 text-xs shrink-0">–</span>
              <input
                type="number"
                min="0"
                value={e.s2}
                onChange={(ev) => updateField(i, 's2', ev.target.value)}
                placeholder="0"
                className="w-12 h-9 text-sm font-bold text-center border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
              {i === entries.length - 1 && entries.length > 1 && (
                <button
                  type="button"
                  onClick={removeLast}
                  className="ml-auto text-gray-300 hover:text-red-500 text-sm leading-none shrink-0"
                  title="Verwijderen"
                >
                  ×
                </button>
              )}
            </div>
            {inTiebreak && (
              <div className="flex items-center gap-2 pl-1">
                <span className="text-xs text-amber-600 shrink-0">Tiebreak — wie wint de set?</span>
                <button
                  type="button"
                  onClick={() => updateField(i, 'tiebreakWinner', 1)}
                  className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${
                    e.tiebreakWinner === 1 ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary/40'
                  }`}
                >
                  Team 1
                </button>
                <button
                  type="button"
                  onClick={() => updateField(i, 'tiebreakWinner', 2)}
                  className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${
                    e.tiebreakWinner === 2 ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary/40'
                  }`}
                >
                  Team 2
                </button>
              </div>
            )}
          </div>
        )
      })}

      {lastEntry.s1 !== '' && lastEntry.s2 !== '' && !isFilled(lastEntry) && !(lastEntry.type === 'set' && lastEntry.s1 === '6' && lastEntry.s2 === '6') && (
        <p className="text-amber-500 text-xs">Score kan niet gelijk zijn</p>
      )}

      {canAddMore && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => addEntry('set')}
            className="flex-1 text-xs py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-primary/40 hover:text-primary"
          >
            + Volgende set
          </button>
          {tied && regularSetsPlayed >= 2 && (
            <button
              type="button"
              onClick={() => addEntry('supertiebreak')}
              className="flex-1 text-xs py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-primary/40 hover:text-primary"
            >
              + Supertiebreak
            </button>
          )}
        </div>
      )}

      {summary && (
        <p className="text-xs text-gray-400 pt-1">
          Sets {summary.setsWon1}-{summary.setsWon2} · Totaal {summary.team1Games} – {summary.team2Games} games
          {decided ? '' : ' · nog niet beslist'}
        </p>
      )}
    </div>
  )
}
