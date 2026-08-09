export default function PhotoPreviewModal({ player, onClose }) {
  if (!player?.avatar_url) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Sluiten"
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-white text-2xl leading-none rounded-full hover:bg-white/10 transition-colors"
      >
        ×
      </button>
      <img
        src={player.avatar_url}
        alt={player.name}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full rounded-lg object-contain"
      />
    </div>
  )
}
