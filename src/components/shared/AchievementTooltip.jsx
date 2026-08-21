import { createPortal } from 'react-dom'

const WIDTH = 200
const MARGIN = 8

// Rendert de tooltip via een portal direct in document.body, met position:fixed
// t.o.v. de viewport. Zo blijft de plaatsing correct ongeacht of een parent
// (kaart, scrollcontainer, badge-knop met hover:scale) een eigen transform,
// filter of overflow heeft — die zouden anders de containing block van een
// geneste position:fixed/absolute element kapen en de tooltip laten "wegvallen".
export default function AchievementTooltip({ anchorRect, onClose, children }) {
  if (!anchorRect) return null

  const left = Math.max(
    MARGIN,
    Math.min(anchorRect.left + anchorRect.width / 2 - WIDTH / 2, window.innerWidth - WIDTH - MARGIN)
  )
  const top = anchorRect.bottom + MARGIN

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        style={{ position: 'fixed', left, top, width: WIDTH, zIndex: 9999 }}
        className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl text-center"
        onClick={(e) => { e.stopPropagation(); onClose() }}
      >
        {children}
      </div>
    </>,
    document.body
  )
}
