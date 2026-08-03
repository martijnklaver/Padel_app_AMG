// Eenmalige timestamp per sessie — voorkomt browser-cache van oude foto's
const SESSION_STAMP = Date.now()

export default function PlayerAvatar({ player, size = 32 }) {
  if (player?.avatar_url) {
    // Strip eventuele bestaande ?t= en voeg versie van deze sessie toe
    const base = player.avatar_url.split('?')[0]
    return (
      <img
        src={`${base}?t=${SESSION_STAMP}`}
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
