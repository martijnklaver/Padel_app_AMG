/**
 * Fair Rotation algorithm for Padel Americano.
 *
 * Rules:
 * 1. Pick the 4 players with lowest points_played.
 * 2. Among those 4, form the team pairing that minimises repeated partnerships.
 *
 * Returns { team1: [p1, p2], team2: [p3, p4], bench: [...] }
 */
export function pickNextMatch(players, completedMatches) {
  if (players.length < 4) return null

  // Sort by points_played asc, break ties by random-ish order (stable insert order)
  const sorted = [...players].sort((a, b) => a.points_played - b.points_played)

  // Take the 4 with fewest points_played
  const candidates = sorted.slice(0, 4)
  const bench = sorted.slice(4)

  // Build partnership frequency map from completed matches
  const pairCount = {}
  const pairKey = (a, b) => [a, b].sort().join('|')

  for (const m of completedMatches) {
    if (!m.is_completed) continue
    const pairs = [
      pairKey(m.team1_p1, m.team1_p2),
      pairKey(m.team2_p1, m.team2_p2),
    ]
    for (const k of pairs) {
      pairCount[k] = (pairCount[k] || 0) + 1
    }
  }

  // All possible ways to split 4 players into 2 teams of 2
  // There are 3 distinct pairings for 4 players: (01|23), (02|13), (03|12)
  const [c0, c1, c2, c3] = candidates
  const pairings = [
    { team1: [c0, c1], team2: [c2, c3] },
    { team1: [c0, c2], team2: [c1, c3] },
    { team1: [c0, c3], team2: [c1, c2] },
  ]

  // Score each pairing by total repeated partnerships (lower is better)
  const scored = pairings.map((p) => {
    const score =
      (pairCount[pairKey(p.team1[0].id, p.team1[1].id)] || 0) +
      (pairCount[pairKey(p.team2[0].id, p.team2[1].id)] || 0)
    return { ...p, score }
  })

  scored.sort((a, b) => a.score - b.score)
  const best = scored[0]

  return {
    team1: best.team1,
    team2: best.team2,
    bench,
  }
}

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
