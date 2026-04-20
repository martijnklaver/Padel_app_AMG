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

export function getRecommendedMatches(playerCount, numCourts) {
  const uniquePairs = (playerCount * (playerCount - 1)) / 2
  return Math.ceil(uniquePairs / Math.max(numCourts, 1))
}

export function getDefaultTotalMatches(playerCount, numCourts) {
  const matchesPerPlayer = getRecommendedMatches(playerCount, numCourts)
  return Math.ceil((matchesPerPlayer * playerCount) / 4)
}

const pairKey = (a, b) => (a < b ? `${a}__${b}` : `${b}__${a}`)
const getCount = (map, a, b) => map.get(pairKey(a, b)) || 0
const incCount = (map, a, b) => map.set(pairKey(a, b), getCount(map, a, b) + 1)

export function generateSchedule(players, numCourts, totalMatches) {
  const partnerCount = new Map()
  const opponentCount = new Map()
  const matchCount = new Map()
  players.forEach((p) => matchCount.set(p.id, 0))

  const schedule = []
  let totalScheduled = 0
  let round = 1

  while (totalScheduled < totalMatches) {
    const courtsThisRound = Math.min(numCourts, totalMatches - totalScheduled)
    const usedThisRound = new Set()
    const courts = []

    for (let court = 1; court <= courtsThisRound; court++) {
      const available = players.filter((p) => !usedThisRound.has(p.id))
      if (available.length < 4) break

      let bestScore = Infinity
      let bestMatch = null

      // Evaluate all C(available,4) × 3 team splits
      for (let i = 0; i < available.length - 3; i++) {
        for (let j = i + 1; j < available.length - 2; j++) {
          for (let k = j + 1; k < available.length - 1; k++) {
            for (let l = k + 1; l < available.length; l++) {
              const four = [available[i], available[j], available[k], available[l]]
              const splits = [
                [[four[0], four[1]], [four[2], four[3]]],
                [[four[0], four[2]], [four[1], four[3]]],
                [[four[0], four[3]], [four[1], four[2]]],
              ]

              for (const [t1, t2] of splits) {
                const pPartner =
                  getCount(partnerCount, t1[0].id, t1[1].id) +
                  getCount(partnerCount, t2[0].id, t2[1].id)
                const pOpponent =
                  getCount(opponentCount, t1[0].id, t2[0].id) +
                  getCount(opponentCount, t1[0].id, t2[1].id) +
                  getCount(opponentCount, t1[1].id, t2[0].id) +
                  getCount(opponentCount, t1[1].id, t2[1].id)

                // Priority 0: fully new; 1: repeated partners only; 2: repeated opponents
                const priority = pOpponent > 0 ? 2 : pPartner > 0 ? 1 : 0

                // Tiebreaker: prefer players who played least (lower total = better)
                const playTotal = [...t1, ...t2].reduce(
                  (sum, p) => sum + matchCount.get(p.id),
                  0
                )

                const score = priority * 10000 + playTotal
                if (score < bestScore) {
                  bestScore = score
                  bestMatch = { t1, t2, pPartner, pOpponent }
                }
              }
            }
          }
        }
      }

      if (!bestMatch) break

      const { t1, t2 } = bestMatch

      const warns = []
      if (getCount(partnerCount, t1[0].id, t1[1].id) > 0)
        warns.push(`⚠️ ${t1[0].name} & ${t1[1].name} speelden al samen`)
      if (getCount(partnerCount, t2[0].id, t2[1].id) > 0)
        warns.push(`⚠️ ${t2[0].name} & ${t2[1].name} speelden al samen`)
      if (bestMatch.pOpponent > 0)
        warns.push(`⚠️ deze tegenstanders stonden al tegenover elkaar`)
      const warning = warns.length > 0 ? warns.join(' | ') : null

      courts.push({
        court,
        team1_p1: t1[0],
        team1_p2: t1[1],
        team2_p1: t2[0],
        team2_p2: t2[1],
        warning,
      })

      for (const p of [...t1, ...t2]) {
        usedThisRound.add(p.id)
        matchCount.set(p.id, matchCount.get(p.id) + 1)
      }
      incCount(partnerCount, t1[0].id, t1[1].id)
      incCount(partnerCount, t2[0].id, t2[1].id)
      for (const p1 of t1) {
        for (const p2 of t2) {
          incCount(opponentCount, p1.id, p2.id)
        }
      }
    }

    if (courts.length === 0) break

    const playingIds = new Set(
      courts.flatMap((c) => [c.team1_p1.id, c.team1_p2.id, c.team2_p1.id, c.team2_p2.id])
    )
    schedule.push({ round, courts, bench: players.filter((p) => !playingIds.has(p.id)) })
    totalScheduled += courts.length
    round++
  }

  return { schedule, roundsTotal: schedule.length }
}
