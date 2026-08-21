import { computeRankingFromMatches, assignPositions, computeBestDuo } from './tournament'

// Badge-catalogus. Key = achievement_key in de database.
export const ACHIEVEMENTS = {
  first_session_win: { icon: '🏆', label: 'Eerste sessie gewonnen' },
  session_wins_5: { icon: '👑', label: '5x sessie gewonnen' },
  session_wins_10: { icon: '👑', label: '10x sessie gewonnen' },
  on_fire_3: { icon: '🔥', label: 'On Fire' },
  unstoppable_5: { icon: '🔥', label: 'Onstopbaar' },
  perfect_session: { icon: '🎯', label: 'Perfect sessie' },
  almost_perfect: { icon: '🎯', label: 'Bijna perfect' },
  duo_dominance_5: { icon: '🤝', label: 'Duo dominantie' },
  duo_dreamteam_10: { icon: '🤝', label: 'Droomteam' },
  poppermeister: { icon: '💥', label: 'Poppermeister' },
  poppermeister_3x: { icon: '💥', label: 'Poppermeister 3x op rij' },
  comeback: { icon: '📈', label: 'Comeback' },
  dominant: { icon: '⚡', label: 'Dominant' },
  unbeatable: { icon: '🛡️', label: 'Onverslaanbaar' },
  eternal_champion: { icon: '🥇', label: 'Eeuwige kampioen' },
  underdog: { icon: '😤', label: 'Underdog' },
}

// "Sessie gewonnen" = positie #1 in de potjes-ranking van die sessie (geldt voor
// elke score modus, want dit is de enige rankingvorm die voor alle modi bestaat).
function sessionWinnerIds(sessionPlayers, sessionMatches) {
  const ranking = assignPositions(
    computeRankingFromMatches(sessionPlayers, sessionMatches).filter((p) => p.played > 0),
    (p) => p.winPct
  )
  return new Set(ranking.filter((p) => p.position === 1).map((p) => p.id))
}

// Speelt de volledige sessiegeschiedenis chronologisch af en geeft alle momenten
// terug waarop een speler aan de criteria van een badge voldeed (met de datum van
// de sessie waarin dat gebeurde). Puur/side-effect-vrij — persistie gebeurt elders.
export function computeAchievementEvents(players, sessions, matches, poppers) {
  const events = []

  const completedSessions = sessions
    .filter((s) => s.is_completed)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || (a.created_at ?? '').localeCompare(b.created_at ?? ''))

  const totalSessionWins = new Map()
  const totalSessionsPlayed = new Map()
  const winStreak = new Map()
  const lossStreak = new Map()
  const popperStreak = new Map()
  const alreadyAwarded = new Map()

  players.forEach((p) => {
    totalSessionWins.set(p.id, 0)
    totalSessionsPlayed.set(p.id, 0)
    winStreak.set(p.id, 0)
    lossStreak.set(p.id, 0)
    popperStreak.set(p.id, 0)
    alreadyAwarded.set(p.id, new Set())
  })

  const maybeAward = (playerId, key, date) => {
    const set = alreadyAwarded.get(playerId)
    if (!set || set.has(key)) return
    set.add(key)
    events.push({ player_id: playerId, achievement_key: key, achieved_at: date })
  }

  let matchesSoFar = []

  for (const session of completedSessions) {
    const sessionMatches = matches.filter((m) => m.session_id === session.id && m.is_completed)
    if (sessionMatches.length === 0) continue

    const sessionPlayerIds = session.player_ids ?? []
    const sessionPlayers = players.filter((p) => sessionPlayerIds.includes(p.id))
    if (sessionPlayers.length === 0) continue

    const date = session.date

    // Carrière-win% van elke deelnemer VOOR deze sessie (voor Underdog)
    const priorRanking = computeRankingFromMatches(sessionPlayers, matchesSoFar)
    const winnerIds = sessionWinnerIds(sessionPlayers, sessionMatches)

    const priorWithData = priorRanking.filter((p) => p.played > 0)
    if (priorWithData.length === sessionPlayers.length && priorWithData.length >= 2) {
      const minPct = Math.min(...priorWithData.map((p) => parseFloat(p.winPct)))
      priorWithData
        .filter((p) => parseFloat(p.winPct) === minPct)
        .forEach((p) => { if (winnerIds.has(p.id)) maybeAward(p.id, 'underdog', date) })
    }

    for (const p of sessionPlayers) {
      const pMatches = sessionMatches.filter((m) =>
        [m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2].includes(p.id)
      )
      const played = pMatches.length
      if (played === 0) continue

      const wins = pMatches.reduce((sum, m) => {
        const onTeam1 = [m.team1_p1, m.team1_p2].includes(p.id)
        return sum + (onTeam1 ? m.normalized_score_team1 : m.normalized_score_team2)
      }, 0)
      const losses = played - Math.round(wins)
      const winPct = (wins / played) * 100

      if (played >= 5 && losses === 0) maybeAward(p.id, 'perfect_session', date)
      if (played >= 8 && losses <= 1) maybeAward(p.id, 'almost_perfect', date)
      if (played >= 10 && winPct > 70) maybeAward(p.id, 'dominant', date)

      totalSessionsPlayed.set(p.id, totalSessionsPlayed.get(p.id) + 1)

      if (winnerIds.has(p.id)) {
        if (lossStreak.get(p.id) >= 3) maybeAward(p.id, 'comeback', date)
        lossStreak.set(p.id, 0)

        const wins2 = totalSessionWins.get(p.id) + 1
        totalSessionWins.set(p.id, wins2)
        const streak2 = winStreak.get(p.id) + 1
        winStreak.set(p.id, streak2)

        if (wins2 === 1) maybeAward(p.id, 'first_session_win', date)
        if (wins2 >= 5) maybeAward(p.id, 'session_wins_5', date)
        if (wins2 >= 10) maybeAward(p.id, 'session_wins_10', date)
        if (streak2 >= 3) maybeAward(p.id, 'on_fire_3', date)
        if (streak2 >= 5) maybeAward(p.id, 'unstoppable_5', date)
      } else {
        winStreak.set(p.id, 0)
        lossStreak.set(p.id, lossStreak.get(p.id) + 1)
      }
    }

    // Poppermeister (van deze sessie) + 3x-op-rij streak
    const sessionPopperRows = poppers.filter((pp) => pp.session_id === session.id)
    const popperTotals = {}
    sessionPopperRows.forEach((pp) => { popperTotals[pp.player_id] = (popperTotals[pp.player_id] || 0) + pp.count })
    const maxPoppers = Object.values(popperTotals).length > 0 ? Math.max(...Object.values(popperTotals)) : 0
    const popperLeaders = new Set(
      maxPoppers > 0 ? Object.entries(popperTotals).filter(([, c]) => c === maxPoppers).map(([id]) => id) : []
    )
    for (const p of sessionPlayers) {
      if (popperLeaders.has(p.id)) {
        maybeAward(p.id, 'poppermeister', date)
        const s = popperStreak.get(p.id) + 1
        popperStreak.set(p.id, s)
        if (s >= 3) maybeAward(p.id, 'poppermeister_3x', date)
      } else {
        popperStreak.set(p.id, 0)
      }
    }

    matchesSoFar = matchesSoFar.concat(sessionMatches)

    // Duo dominantie / droomteam — cumulatief inclusief deze sessie
    computeBestDuo(players, matchesSoFar).forEach((d) => {
      if (d.wins >= 5) d.ids.forEach((id) => maybeAward(id, 'duo_dominance_5', date))
      if (d.wins >= 10) d.ids.forEach((id) => maybeAward(id, 'duo_dreamteam_10', date))
    })

    // Onverslaanbaar — carrière win/verlies-ratio tot nu toe
    computeRankingFromMatches(players, matchesSoFar).forEach((p) => {
      if (p.played >= 50) {
        const losses = p.played - Math.round(p.wins)
        if (losses / p.played < 0.3) maybeAward(p.id, 'unbeatable', date)
      }
    })

    // Eeuwige kampioen — meeste sessies gewonnen, onder spelers met min. 10 sessies gespeeld
    const eligible = players.filter((p) => totalSessionsPlayed.get(p.id) >= 10)
    if (eligible.length > 0) {
      const maxWins = Math.max(...eligible.map((p) => totalSessionWins.get(p.id)))
      if (maxWins > 0) {
        eligible
          .filter((p) => totalSessionWins.get(p.id) === maxWins)
          .forEach((p) => maybeAward(p.id, 'eternal_champion', date))
      }
    }
  }

  return events
}
