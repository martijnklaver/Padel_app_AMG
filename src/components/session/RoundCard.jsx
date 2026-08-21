import PointsScoreInput from './PointsScoreInput'
import GamesScoreInput from './GamesScoreInput'
import GamesSetsScoreInput from './GamesSetsScoreInput'
import PlayerAvatar from '../shared/PlayerAvatar'
import { formatSetDetails } from '../../utils/tournament'

export default function RoundCard({
  title,
  scheduleRows,
  session,
  players,
  matches,
  nicknames,
  onScoreSaved,
  onEdit,
  muted,
}) {
  const playerName = (id) => {
    const nick = nicknames?.[id]
    return nick?.trim() || players.find((p) => p.id === id)?.name || '?'
  }

  const findMatch = (row) =>
    matches.find(
      (m) =>
        m.session_id === session.id &&
        m.round_number === row.round_number &&
        ((m.team1_p1 === row.team1_p1 && m.team1_p2 === row.team1_p2) ||
          (m.team1_p1 === row.team1_p2 && m.team1_p2 === row.team1_p1))
    )

  const sessionPlayers = players.filter((p) => session.player_ids.includes(p.id))
  const playingIds = new Set(
    scheduleRows.flatMap((r) => [r.team1_p1, r.team1_p2, r.team2_p1, r.team2_p2])
  )
  const bench = sessionPlayers.filter((p) => !playingIds.has(p.id))

  const scoreLabel = (match) => {
    if (!match?.is_completed) return null
    if (session.score_mode === 'games') return match.winner === 1 ? '1 – 0' : '0 – 1'
    return `${match.score_team1} – ${match.score_team2}`
  }

  return (
    <div className={`card ${muted ? 'bg-gray-50 border-gray-200' : 'bg-orange-50 border-orange-200'}`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{title}</p>

      {scheduleRows.map((row) => {
        const match = findMatch(row)
        const done = match?.is_completed

        const p = (id) => players.find((pl) => pl.id === id)
        return (
          <div key={row.id}>
            {done ? (
              <div className="flex items-center gap-2">
                <div className={`flex-1 flex flex-col items-center gap-1 text-sm ${match.winner === 1 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                  <div className="flex gap-1 justify-center">
                    <PlayerAvatar player={p(row.team1_p1)} size={20} />
                    <PlayerAvatar player={p(row.team1_p2)} size={20} />
                  </div>
                  <span className="text-center leading-tight">{playerName(row.team1_p1)} & {playerName(row.team1_p2)}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {session.score_mode === 'games_sets' ? (
                    <div className="text-center">
                      <div className="font-bold text-gray-800 text-sm">{formatSetDetails(match.set_details)}</div>
                      <div className="text-[11px] text-gray-400">{match.score_team1} – {match.score_team2} games</div>
                    </div>
                  ) : (
                    <span className="font-bold text-gray-800 text-sm">{scoreLabel(match)}</span>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(match, row)}
                      className="text-xs text-gray-400 hover:text-primary"
                    >
                      ✏️
                    </button>
                  )}
                </div>
                <div className={`flex-1 flex flex-col items-center gap-1 text-sm ${match.winner === 2 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                  <div className="flex gap-1 justify-center">
                    <PlayerAvatar player={p(row.team2_p1)} size={20} />
                    <PlayerAvatar player={p(row.team2_p2)} size={20} />
                  </div>
                  <span className="text-center leading-tight">{playerName(row.team2_p1)} & {playerName(row.team2_p2)}</span>
                </div>
              </div>
            ) : !muted ? (
              session.score_mode === 'points' ? (
                <PointsScoreInput
                  scheduleRow={row}
                  session={session}
                  players={players}
                  nicknames={nicknames}
                  onSaved={onScoreSaved}
                />
              ) : session.score_mode === 'games_sets' ? (
                <GamesSetsScoreInput
                  scheduleRow={row}
                  session={session}
                  players={players}
                  nicknames={nicknames}
                  onSaved={onScoreSaved}
                />
              ) : (
                <GamesScoreInput
                  scheduleRow={row}
                  session={session}
                  players={players}
                  nicknames={nicknames}
                  onSaved={onScoreSaved}
                />
              )
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex gap-1 justify-center">
                    <PlayerAvatar player={p(row.team1_p1)} size={18} />
                    <PlayerAvatar player={p(row.team1_p2)} size={18} />
                  </div>
                  <span className="text-center text-xs">{playerName(row.team1_p1)} & {playerName(row.team1_p2)}</span>
                </div>
                <span className="text-gray-300 shrink-0">vs</span>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex gap-1 justify-center">
                    <PlayerAvatar player={p(row.team2_p1)} size={18} />
                    <PlayerAvatar player={p(row.team2_p2)} size={18} />
                  </div>
                  <span className="text-center text-xs">{playerName(row.team2_p1)} & {playerName(row.team2_p2)}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {bench.length > 0 && (
        <p className="text-xs text-gray-400 mt-3">
          Bank: {bench.map((p) => p.name).join(', ')}
        </p>
      )}
    </div>
  )
}
