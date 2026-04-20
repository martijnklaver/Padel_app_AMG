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

export function computeSessionRanking(session, players, matches) {
  const sessionPlayers = players.filter((p) => session.player_ids.includes(p.id))
  const sessionMatches = matches.filter((m) => m.session_id === session.id)
  return computeRankingFromMatches(sessionPlayers, sessionMatches)
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
