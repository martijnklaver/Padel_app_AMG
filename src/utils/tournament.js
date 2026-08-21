// Vaste optimale rondevolgorde voor 5 spelers (0-geïndexeerde posities)
const FIVE_PLAYER_ROUNDS = [
  { t1: [0, 1], t2: [2, 3] },
  { t1: [0, 1], t2: [2, 4] },
  { t1: [0, 4], t2: [2, 3] },
  { t1: [0, 4], t2: [1, 3] },
  { t1: [2, 1], t2: [3, 4] },
  { t1: [0, 2], t2: [1, 3] },
  { t1: [0, 2], t2: [1, 4] },
  { t1: [0, 3], t2: [2, 4] },
  { t1: [0, 1], t2: [3, 4] },
  { t1: [2, 4], t2: [1, 3] },
  { t1: [0, 3], t2: [2, 1] },
  { t1: [0, 4], t2: [2, 1] },
  { t1: [0, 2], t2: [3, 4] },
  { t1: [0, 3], t2: [1, 4] },
  { t1: [2, 3], t2: [1, 4] },
]

export function generateFivePlayerSchedule(players, totalMatches) {
  const allIndices = [0, 1, 2, 3, 4]
  const rounds = FIVE_PLAYER_ROUNDS.slice(0, totalMatches)

  const schedule = rounds.map(({ t1, t2 }, i) => {
    const used = new Set([...t1, ...t2])
    return {
      round: i + 1,
      courts: [{
        team1_p1: players[t1[0]],
        team1_p2: players[t1[1]],
        team2_p1: players[t2[0]],
        team2_p2: players[t2[1]],
      }],
      bench: allIndices.filter(idx => !used.has(idx)).map(idx => players[idx]),
    }
  })

  return { schedule, roundsTotal: schedule.length }
}

// C(N,4) * 3 — exact maximum unique matches for N players
export function maxUniqueMatches(playerCount) {
  if (playerCount < 4) return 0
  const n = playerCount
  return Math.round((n * (n - 1) * (n - 2) * (n - 3)) / 24) * 3
}

export function generateSchedule(players, totalMatches) {
  const numCourts = 1
  const n = players.length
  const candidates = []

  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          const four = [players[i], players[j], players[k], players[l]]
          candidates.push({ t1: [four[0], four[1]], t2: [four[2], four[3]] })
          candidates.push({ t1: [four[0], four[2]], t2: [four[1], four[3]] })
          candidates.push({ t1: [four[0], four[3]], t2: [four[1], four[2]] })
        }
      }
    }
  }

  // Fisher-Yates shuffle — willekeurige volgorde per sessie
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }

  const matchCount = new Map()
  players.forEach((p) => matchCount.set(p.id, 0))

  const schedule = []
  let totalScheduled = 0
  let round = 1

  while (totalScheduled < totalMatches && candidates.length > 0) {
    const courtsThisRound = Math.min(numCourts, totalMatches - totalScheduled)
    const usedThisRound = new Set()
    const courts = []

    for (let court = 1; court <= courtsThisRound; court++) {
      const available = players.filter((p) => !usedThisRound.has(p.id))
      if (available.length < 4) break

      const availableIds = new Set(available.map((p) => p.id))

      let bestIdx = -1
      let bestPlayTotal = Infinity

      for (let idx = 0; idx < candidates.length; idx++) {
        const { t1, t2 } = candidates[idx]
        if (![...t1, ...t2].every((p) => availableIds.has(p.id))) continue
        const playTotal = [...t1, ...t2].reduce(
          (sum, p) => sum + matchCount.get(p.id),
          0
        )
        if (playTotal < bestPlayTotal) {
          bestPlayTotal = playTotal
          bestIdx = idx
        }
      }

      if (bestIdx === -1) break

      const { t1, t2 } = candidates[bestIdx]
      candidates.splice(bestIdx, 1)

      courts.push({
        team1_p1: t1[0],
        team1_p2: t1[1],
        team2_p1: t2[0],
        team2_p2: t2[1],
      })

      for (const p of [...t1, ...t2]) {
        usedThisRound.add(p.id)
        matchCount.set(p.id, matchCount.get(p.id) + 1)
      }
    }

    if (courts.length === 0) break

    const playingIds = new Set(
      courts.flatMap((c) => [c.team1_p1.id, c.team1_p2.id, c.team2_p1.id, c.team2_p2.id])
    )
    schedule.push({
      round,
      courts,
      bench: players.filter((p) => !playingIds.has(p.id)),
    })
    totalScheduled += courts.length
    round++
  }

  return { schedule, roundsTotal: schedule.length }
}

export function computeRankingFromMatches(players, matches) {
  const stats = new Map(players.map((p) => [p.id, { wins: 0, played: 0 }]))

  for (const m of matches) {
    if (!m.is_completed) continue
    for (const pid of [m.team1_p1, m.team1_p2]) {
      if (stats.has(pid)) {
        stats.get(pid).played++
        stats.get(pid).wins += m.normalized_score_team1
      }
    }
    for (const pid of [m.team2_p1, m.team2_p2]) {
      if (stats.has(pid)) {
        stats.get(pid).played++
        stats.get(pid).wins += m.normalized_score_team2
      }
    }
  }

  return players
    .map((p) => ({
      ...p,
      wins: stats.get(p.id)?.wins ?? 0,
      played: stats.get(p.id)?.played ?? 0,
      winPct:
        (stats.get(p.id)?.played ?? 0) > 0
          ? ((stats.get(p.id).wins / stats.get(p.id).played) * 100).toFixed(1)
          : null,
    }))
    .sort((a, b) => {
      const pa = a.winPct !== null ? parseFloat(a.winPct) : -Infinity
      const pb = b.winPct !== null ? parseFloat(b.winPct) : -Infinity
      if (pb !== pa) return pb - pa
      return b.wins - a.wins
    })
}

// Points-mode ranking: uses actual scores, not win/loss
export function computePointsRankingFromMatches(players, matches) {
  const stats = new Map(players.map((p) => [p.id, { pointsWon: 0, pointsPlayed: 0 }]))

  for (const m of matches) {
    if (!m.is_completed) continue
    const total = (m.score_team1 ?? 0) + (m.score_team2 ?? 0)
    for (const pid of [m.team1_p1, m.team1_p2]) {
      if (stats.has(pid)) {
        stats.get(pid).pointsWon += m.score_team1 ?? 0
        stats.get(pid).pointsPlayed += total
      }
    }
    for (const pid of [m.team2_p1, m.team2_p2]) {
      if (stats.has(pid)) {
        stats.get(pid).pointsWon += m.score_team2 ?? 0
        stats.get(pid).pointsPlayed += total
      }
    }
  }

  return players
    .map((p) => ({
      ...p,
      pointsWon: stats.get(p.id)?.pointsWon ?? 0,
      pointsPlayed: stats.get(p.id)?.pointsPlayed ?? 0,
      pct:
        (stats.get(p.id)?.pointsPlayed ?? 0) > 0
          ? ((stats.get(p.id).pointsWon / stats.get(p.id).pointsPlayed) * 100).toFixed(1)
          : null,
    }))
    .sort((a, b) => {
      const pa = a.pct !== null ? parseFloat(a.pct) : -Infinity
      const pb = b.pct !== null ? parseFloat(b.pct) : -Infinity
      if (pb !== pa) return pb - pa
      return b.pointsWon - a.pointsWon
    })
}

export function assignPositions(ranking, getScore) {
  let pos = 1
  return ranking.map((entry, i, arr) => {
    if (i > 0 && getScore(arr[i - 1]) !== getScore(entry)) pos = i + 1
    const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null
    return { ...entry, position: pos, medal }
  })
}

export function computeSessionRanking(session, players, matches) {
  const sessionPlayers = players.filter((p) => session.player_ids.includes(p.id))
  const sessionMatches = matches.filter((m) => m.session_id === session.id)
  if (session.score_mode === 'points') {
    return computePointsRankingFromMatches(sessionPlayers, sessionMatches)
  }
  return computeRankingFromMatches(sessionPlayers, sessionMatches)
}

// Games & Sets — samenvatting van een set_details array (zoals opgeslagen op matches.set_details)
export function summarizeSetDetails(setDetails) {
  let team1Games = 0
  let team2Games = 0
  let setsWon1 = 0
  let setsWon2 = 0

  for (const s of setDetails ?? []) {
    team1Games += s.team1
    team2Games += s.team2
    if (s.team1 > s.team2) setsWon1++
    else if (s.team2 > s.team1) setsWon2++
  }

  const winner = setsWon1 > setsWon2 ? 1 : setsWon2 > setsWon1 ? 2 : null

  return { team1Games, team2Games, setsWon1, setsWon2, winner }
}

// Games & Sets — leesbare weergave per set, bijv. "6-4, 7-6(TB)" of "ST 10-7"
export function formatSetDetails(setDetails) {
  if (!setDetails?.length) return ''
  return setDetails
    .map((s) => (s.supertiebreak ? 'Supertiebreak' : `${s.team1}-${s.team2}${s.tiebreak ? '(TB)' : ''}`))
    .join(', ')
}

export function computeBestDuo(players, allMatches) {
  const duoStats = new Map()

  const key = (id1, id2) => [id1, id2].sort().join('|')

  for (const m of allMatches) {
    if (!m.is_completed) continue

    const pairs = [
      { ids: [m.team1_p1, m.team1_p2], won: m.normalized_score_team1 === 1.0 },
      { ids: [m.team2_p1, m.team2_p2], won: m.normalized_score_team2 === 1.0 },
    ]

    for (const { ids, won } of pairs) {
      const k = key(ids[0], ids[1])
      if (!duoStats.has(k)) duoStats.set(k, { ids, wins: 0, played: 0 })
      const s = duoStats.get(k)
      s.played++
      if (won) s.wins++
    }
  }

  return [...duoStats.values()]
    .map((s) => ({
      ...s,
      names: s.ids.map((id) => players.find((p) => p.id === id)?.name ?? id),
      winPct: s.played > 0 ? ((s.wins / s.played) * 100).toFixed(1) : null,
    }))
    .filter((s) => s.played > 0)
    .sort((a, b) => {
      const pa = a.winPct !== null ? parseFloat(a.winPct) : -Infinity
      const pb = b.winPct !== null ? parseFloat(b.winPct) : -Infinity
      if (pb !== pa) return pb - pa
      return b.wins - a.wins
    })
}

// Punten-modus variant van computeBestDuo — win% op basis van gescoorde punten
// als team, in plaats van gewonnen/verloren potjes.
export function computeBestDuoByPoints(players, allMatches) {
  const duoStats = new Map()

  const key = (id1, id2) => [id1, id2].sort().join('|')

  for (const m of allMatches) {
    if (!m.is_completed) continue

    const total = (m.score_team1 ?? 0) + (m.score_team2 ?? 0)
    const pairs = [
      { ids: [m.team1_p1, m.team1_p2], pointsWon: m.score_team1 ?? 0 },
      { ids: [m.team2_p1, m.team2_p2], pointsWon: m.score_team2 ?? 0 },
    ]

    for (const { ids, pointsWon } of pairs) {
      const k = key(ids[0], ids[1])
      if (!duoStats.has(k)) duoStats.set(k, { ids, pointsWon: 0, pointsPlayed: 0, played: 0 })
      const s = duoStats.get(k)
      s.pointsWon += pointsWon
      s.pointsPlayed += total
      s.played++
    }
  }

  return [...duoStats.values()]
    .map((s) => ({
      ...s,
      names: s.ids.map((id) => players.find((p) => p.id === id)?.name ?? id),
      pct: s.pointsPlayed > 0 ? ((s.pointsWon / s.pointsPlayed) * 100).toFixed(1) : null,
    }))
    .filter((s) => s.played > 0)
    .sort((a, b) => {
      const pa = a.pct !== null ? parseFloat(a.pct) : -Infinity
      const pb = b.pct !== null ? parseFloat(b.pct) : -Infinity
      if (pb !== pa) return pb - pa
      return b.pointsWon - a.pointsWon
    })
}

export function computeFairestMatchup(players, allMatches) {
  const matchupStats = new Map()

  // Canonical key: sort both teams internally, then sort the two team-strings
  const key = (p1, p2, p3, p4) => {
    const t1 = [p1, p2].sort().join(',')
    const t2 = [p3, p4].sort().join(',')
    return [t1, t2].sort().join('|')
  }

  for (const m of allMatches) {
    if (!m.is_completed) continue

    const k = key(m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2)
    const diff = Math.abs((m.score_team1 ?? 0) - (m.score_team2 ?? 0))

    if (!matchupStats.has(k)) {
      matchupStats.set(k, {
        team1Ids: [m.team1_p1, m.team1_p2].sort(),
        team2Ids: [m.team2_p1, m.team2_p2].sort(),
        totalDiff: 0,
        played: 0,
      })
    }

    const s = matchupStats.get(k)
    s.totalDiff += diff
    s.played++
  }

  return [...matchupStats.values()]
    .map((s) => ({
      ...s,
      team1Names: s.team1Ids.map((id) => players.find((p) => p.id === id)?.name ?? id),
      team2Names: s.team2Ids.map((id) => players.find((p) => p.id === id)?.name ?? id),
      avgDiff: s.played > 0 ? (s.totalDiff / s.played).toFixed(1) : null,
    }))
    .filter((s) => s.played > 0)
    .sort((a, b) => parseFloat(a.avgDiff) - parseFloat(b.avgDiff))
}
