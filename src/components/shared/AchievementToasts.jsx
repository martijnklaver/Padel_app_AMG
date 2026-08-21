import { useEffect } from 'react'

// Toont "🏆 [Naam] behaalt: [Badge]!" toasts, elk auto-dismissend na 5s.
export default function AchievementToasts({ toasts, onDismiss }) {
  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(() => onDismiss(toasts[0].id), 5000)
    return () => clearTimeout(timer)
  }, [toasts, onDismiss])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm px-4 md:px-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-white border border-amber-200 shadow-lg rounded-xl px-4 py-3 flex items-center gap-3"
        >
          <span className="text-2xl shrink-0">{t.icon}</span>
          <p className="text-sm text-gray-800">
            <span className="font-bold">{t.icon} {t.playerName}</span> behaalt: <span className="font-semibold">{t.label}</span>!
          </p>
        </div>
      ))}
    </div>
  )
}
