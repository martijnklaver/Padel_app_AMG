import { useState } from 'react'

function Initials({ player, size }) {
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

export default function PlayerAvatar({ player, size = 32 }) {
  const [loaded, setLoaded] = useState(false)

  if (!player?.avatar_url) return <Initials player={player} size={size} />

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Altijd zichtbaar tot de foto geladen is — nooit een lege plek */}
      {!loaded && (
        <div className="absolute inset-0">
          <Initials player={player} size={size} />
        </div>
      )}
      <img
        src={player.avatar_url}
        alt={player.name}
        loading="eager"
        fetchPriority="high"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
        className="rounded-full object-cover absolute inset-0 transition-opacity duration-150"
        style={{ width: size, height: size, opacity: loaded ? 1 : 0 }}
      />
    </div>
  )
}
