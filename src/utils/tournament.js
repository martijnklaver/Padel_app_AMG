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

// Recommended matches per player: cover all unique pairs once
export function getRecommendedMatches(playerCount, numCourts) {
  const uniquePairs = (playerCount * (playerCount - 1)) / 2
  return Math.ceil(uniquePairs / Math.max(numCourts, 1))
}

const pairKey = (a, b) => (a < b ? `${a}__${b}` : `${b}__${a}`)
const getCount = (map, a, b) => map.get(pairKey(a, b)) || 0
const incCount = (map, a, b) => map.set(pairKey(a, b), getCount(map, a, b) + 1)

export function generateSchedule(players, numCourts, matchesPerPlayer) {
  const n = players.length
  const roundsTotal = Math.ceil((matchesPerPlayer * n) / (4 * numCourts))

  const partnerCount = new Map()
  const opponentCount = new Map()
  const matchCount = new Map()
  players.forEach((p) => matchCount.set(p.id, 0))

  const schedule = []

  for (let round = 1; round <= roundsTotal; round++) {
    const sorted = [...players].sort(
      (a, b) => matchCount.get(a.id) - matchCount.get(b.id)
    )

    const active = sorted.slice(0, 4 * numCourts)
    const bench = sorted.slice(4 * numCourts)
    const remaining = [...active]
    const courts = []

    for (let court = 1; court <= numCourts; court++) {
      if (remaining.length < 4) break

      let bestScore = Infinity
      let bestMatch = null

      // Try all C(remaining,4) x 3 team splits
      for (let i = 0; i < remaining.length - 3; i++) {
        for (let j = i + 1; j < remaining.length - 2; j++) {
          for (let k = j + 1; k < remaining.length - 1; k++) {
            for (let l = k + 1; l < remaining.length; l++) {
              const four = [remaining[i], remaining[j], remaining[k], remaining[l]]
              const splits = [
                [
                  [four[0], four[1]],
                  [four[2], four[3]],
                ],
                [
                  [four[0], four[2]],
                  [four[1], four[3]],
                ],
                [
                  [four[0], four[3]],
                  [four[1], four[2]],
                ],
              ]

              for (const [t1, t2] of splits) {
                const pScore =
                  getCount(partnerCount, t1[0].id, t1[1].id) +
                  getCount(partnerCount, t2[0].id, t2[1].id)
                const oScore =
                  getCount(opponentCount, t1[0].id, t2[0].id) +
                  getCount(opponentCount, t1[0].id, t2[1].id) +
                  getCount(opponentCount, t1[1].id, t2[0].id) +
                  getCount(opponentCount, t1[1].id, t2[1].id)
                const total = pScore * 2 + oScore
                if (total < bestScore) {
                  bestScore = total
                  bestMatch = { t1, t2, pScore }
                }
              }
            }
          }
        }
      }

      if (!bestMatch) break

      const { t1, t2 } = bestMatch
      const t1Repeated = getCount(partnerCount, t1[0].id, t1[1].id) > 0
      const t2Repeated = getCount(partnerCount, t2[0].id, t2[1].id) > 0

      let warning = null
      if (t1Repeated) {
        warning = `⚠️ ${t1[0].name} & ${t1[1].name} hebben al eerder samen gespeeld`
      } else if (t2Repeated) {
        warning = `⚠️ ${t2[0].name} & ${t2[1].name} hebben al eerder samen gespeeld`
      }

      courts.push({
        court,
        team1_p1: t1[0],
        team1_p2: t1[1],
        team2_p1: t2[0],
        team2_p2: t2[1],
        warning,
      })

      incCount(partnerCount, t1[0].id, t1[1].id)
      incCount(partnerCount, t2[0].id, t2[1].id)
      for (const p1 of t1) {
        for (const p2 of t2) {
          incCount(opponentCount, p1.id, p2.id)
        }
      }
      for (const p of [...t1, ...t2]) {
        matchCount.set(p.id, matchCount.get(p.id) + 1)
        const idx = remaining.findIndex((r) => r.id === p.id)
        if (idx !== -1) remaining.splice(idx, 1)
      }
    }

    schedule.push({ round, courts, bench })
  }

  return { schedule, roundsTotal }
}
