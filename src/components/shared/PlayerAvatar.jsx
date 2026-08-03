export default function PlayerAvatar({ player, size = 32 }) {
  if (player?.avatar_url) {
    return (
      <img
        src={player.avatar_url}
        alt={player.name}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: 'rgba(239, 125, 45, 0.18)',
        color: '#EF7D2D',
        fontSize: Math.max(10, Math.round(size * 0.42)),
      }}
    >
      {player?.name?.charAt(0)?.toUpperCase() ?? '?'}
    </div>
  )
}
