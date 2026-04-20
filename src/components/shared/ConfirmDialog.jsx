export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Bevestigen',
  confirmClass = 'bg-red-500 hover:bg-red-600 text-white',
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 btn-secondary"
          >
            Annuleren
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 font-semibold px-4 py-2 rounded-lg transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
