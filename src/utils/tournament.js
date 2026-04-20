export function computeRanking(players) {
  return [...players]
    .map((p) => ({
      ...p,
      percentage:
        p.points_played > 0
          ? ((p.points_won / p.points_played) * 100).toFixed(1)
          : null,
    }))
    .sort((a, b) => {
      const pa = a.percentage !== null ? parseFloat(a.percentage) : -Infinity
      const pb = b.percentage !== null ? parseFloat(b.percentage) : -Infinity
      if (pb !== pa) return pb - pa
      return b.points_won - a.points_won
    })
}

// C(N,4) * 3 — exact maximum unique matches for N players
export function maxUniqueMatches(playerCount) {
  if (playerCount < 4) return 0
  const n = playerCount
  return Math.round((n * (n - 1) * (n - 2) * (n - 3)) / 24) * 3
}

export function getDefaultTotalMatches(playerCount, numCourts) {
  const uniquePairs = (playerCount * (playerCount - 1)) / 2
  const matchesPerPlayer = Math.ceil(uniquePairs / Math.max(numCourts, 1))
  const suggested = Math.ceil((matchesPerPlayer * playerCount) / 4)
  return Math.min(suggested, maxUniqueMatches(playerCount))
}

export function generateSchedule(players, numCourts, totalMatches) {
  // Pre-generate full candidate list: C(N,4) * 3 unique matches
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

      // Find the unique candidate where all 4 players are available.
      // Tiebreaker: prefer players with fewest matches played (bench fairness).
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
      candidates.splice(bestIdx, 1) // Permanently remove — never repeat

      courts.push({
        court,
        team1_p1: t1[0],
        team1_p2: t1[1],
        team2_p1: t2[0],
        team2_p2: t2[1],
        warning: null,
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
