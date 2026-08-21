import { useState } from 'react'
import { uploadSessionPhoto, removeSessionPhoto } from '../../supabaseClient'

export default function SessionPhoto({ sessionId, photoUrl, onUpdated }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = async (file) => {
    if (!file) return
    setUploading(true)
    setError(null)
    const { url, error: err } = await uploadSessionPhoto(sessionId, file)
    if (err) setError(err)
    else onUpdated(url)
    setUploading(false)
  }

  const handleRemove = async () => {
    setUploading(true)
    setError(null)
    const { error: err } = await removeSessionPhoto(sessionId)
    if (err) setError(err)
    else onUpdated(null)
    setUploading(false)
  }

  const onFileInput = (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    handleFile(file)
  }

  if (photoUrl) {
    return (
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">📷 Picca van de dag</p>
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
          <img src={photoUrl} alt="Picca van de dag" className="w-full max-h-96 object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-sm text-gray-500">Bezig...</div>
          )}
        </div>
        <div className="flex gap-4 mt-2">
          <label className="text-xs text-gray-400 hover:text-primary cursor-pointer">
            📷 Wijzigen
            <input type="file" accept="image/*" className="hidden" onChange={onFileInput} />
          </label>
          <label className="text-xs text-gray-400 hover:text-primary cursor-pointer">
            📸 Camera
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileInput} />
          </label>
          <button onClick={handleRemove} className="text-xs text-red-400 hover:text-red-600 ml-auto">
            🗑️ Verwijderen
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex gap-2">
        <label className="flex-1 btn-secondary text-center cursor-pointer flex items-center justify-center gap-1.5">
          📷 Picca van de dag toevoegen
          <input type="file" accept="image/*" className="hidden" onChange={onFileInput} />
        </label>
        <label className="btn-secondary px-4 cursor-pointer flex items-center justify-center shrink-0" title="Camera">
          📸
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileInput} />
        </label>
      </div>
      {uploading && <p className="text-xs text-gray-400 mt-1">Bezig met uploaden...</p>}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
