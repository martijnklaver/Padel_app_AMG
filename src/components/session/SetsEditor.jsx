import { useEffect, useState } from 'react'
import { summarizeSetDetails } from '../../utils/tournament'

function toSetDetails(entries) {
  return entries.map((e, i) => {
    if (e.type === 'supertiebreak') {
      const w = parseInt(e.s1) > parseInt(e.s2) ? 1 : 2
      return { supertiebreak: true, team1: w === 1 ? 1 : 0, team2: w === 2 ? 1 : 0 }
    }
    return { set: i + 1, team1: parseInt(e.s1), team2: parseInt(e.s2), tiebreak: !!e.tiebreak }
  })
}

function entriesFromSetDetails(setDetails) {
  if (!setDetails?.length) return [{ type: 'set', s1: '', s2: '', tiebreak: false }]
  return setDetails.map((s) =>
    s.supertiebreak
      ? { type: 'supertiebreak', s1: String(s.team1 === 1 ? 1 : 0), s2: String(s.team2 === 1 ? 1 : 0) }
      : { type: 'set', s1: String(s.team1), s2: String(s.team2), tiebreak: !!s.tiebreak }
  )
}

const majorityFor = (setsFormat) => Math.floor(setsFormat / 2) + 1

// Games & Sets — invoer voor 4-spelers wedstrijden: per set een score, optionele
// tiebreak-markering, en bij gelijke stand een keuze tussen een volgende set of supertiebreak.
export default function SetsEditor({ setsFormat, initialSetDetails, onChange }) {
  const [entries, setEntries] = useState(() => entriesFromSetDetails(initialSetDetails))

  const update = (next) => setEntries(next)

  const updateField = (i, field, value) => {
    update(entries.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)))
  }

  const removeLast = () => {
    if (entries.length <= 1) return
    update(entries.slice(0, -1))
  }

  const addEntry = (type) => {
    update([...entries, { type, s1: '', s2: '', tiebreak: false }])
  }

  const isFilled = (e) =>
    e.s1 !== '' && e.s2 !== '' && !isNaN(parseInt(e.s1)) && !isNaN(parseInt(e.s2)) && parseInt(e.s1) !== parseInt(e.s2)

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
      {entries.map((e, i) => (
        <div key={i} className="flex items-center gap-2">
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
          {e.type === 'set' && (
            <label className="flex items-center gap-1 text-xs text-gray-500 ml-1">
              <input
                type="checkbox"
                checked={e.tiebreak}
                onChange={(ev) => updateField(i, 'tiebreak', ev.target.checked)}
              />
              Tiebreak
            </label>
          )}
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
      ))}

      {lastEntry.s1 !== '' && lastEntry.s2 !== '' && !isFilled(lastEntry) && (
        <p className="text-amber-500 text-xs">Score kan niet gelijk zijn</p>
      )}

      {canAddMore && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => addEntry('set')}
            className="flex-1 text-xs py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-primary/40 hover:text-primary"
          >
            + Set {regularSetsPlayed + 1} toevoegen
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
