import { useState } from 'react'
import { Paperclip } from 'lucide-react'
import { supabase, uploadPlayerAvatar } from '../../supabaseClient'
import PlayerAvatar from '../shared/PlayerAvatar'

export default function SettingsScreen({ players, onPlayersUpdated }) {
  const [names, setNames] = useState(() =>
    Object.fromEntries(players.map((p) => [p.id, p.name]))
  )
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [uploading, setUploading] = useState({})
  const [avatarSaved, setAvatarSaved] = useState({})
  const [avatarError, setAvatarError] = useState({})

  const handleSave = async (player) => {
    const newName = names[player.id].trim()
    if (!newName || newName === player.name) return

    setSaving((s) => ({ ...s, [player.id]: true }))
    const { error } = await supabase
      .from('players')
      .update({ name: newName })
      .eq('id', player.id)

    if (!error) {
      onPlayersUpdated(players.map((p) => p.id === player.id ? { ...p, name: newName } : p))
      setSaved((s) => ({ ...s, [player.id]: true }))
      setTimeout(() => setSaved((s) => ({ ...s, [player.id]: false })), 2000)
    }
    setSaving((s) => ({ ...s, [player.id]: false }))
  }

  const handleAvatarUpload = async (player, file) => {
    if (!file) return
    setUploading((u) => ({ ...u, [player.id]: true }))
    setAvatarSaved((s) => ({ ...s, [player.id]: false }))
    setAvatarError((e) => ({ ...e, [player.id]: null }))

    const { error, url } = await uploadPlayerAvatar(player.id, file)

    if (error) {
      setAvatarError((e) => ({ ...e, [player.id]: error }))
    } else {
      onPlayersUpdated(players.map((p) => p.id === player.id ? { ...p, avatar_url: url } : p))
      setAvatarSaved((s) => ({ ...s, [player.id]: true }))
      setTimeout(() => setAvatarSaved((s) => ({ ...s, [player.id]: false })), 3000)
    }
    setUploading((u) => ({ ...u, [player.id]: false }))
  }

  const handleAvatarDelete = async (player) => {
    await supabase.storage.from('avatars').remove([`${player.id}.jpg`])
    await supabase.from('players').update({ avatar_url: null }).eq('id', player.id)
    onPlayersUpdated(players.map((p) => p.id === player.id ? { ...p, avatar_url: null } : p))
  }

  return (
    <div className="w-full max-w-lg mx-auto p-4 pb-24 overflow-x-hidden">
      <h2 className="text-xl font-bold text-gray-900 mb-1 pt-2">Spelerbeheer</h2>
      <p className="text-sm text-gray-500 mb-6">Spelers beheren</p>

      <div className="space-y-3 w-full">
        {players.map((player) => (
          <div key={player.id} className="card w-full overflow-hidden">
            {/* Avatar + naam */}
            <div className="flex items-center gap-3 mb-3 w-full">
              <PlayerAvatar player={player} size={48} />
              <input
                type="text"
                value={names[player.id]}
                onChange={(e) => setNames((n) => ({ ...n, [player.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleSave(player)}
                className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Opslaan knop */}
            <button
              onClick={() => handleSave(player)}
              disabled={saving[player.id] || names[player.id].trim() === player.name}
              className="btn-primary text-sm w-full mb-3 disabled:opacity-40"
            >
              {saving[player.id] ? '...' : saved[player.id] ? '✓ Opgeslagen' : 'Opslaan'}
            </button>

            {/* Foto knoppen */}
            {uploading[player.id] ? (
              <p className="text-xs text-gray-400">Uploaden...</p>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex gap-2 w-full">
                  <label className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-primary cursor-pointer border border-gray-200 rounded-lg px-2.5 py-2 hover:border-primary/40 transition-colors">
                    📸 Foto maken
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      onChange={(e) => { handleAvatarUpload(player, e.target.files[0]); e.target.value = '' }}
                    />
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-primary cursor-pointer border border-gray-200 rounded-lg px-2.5 py-2 hover:border-primary/40 transition-colors">
                    <Paperclip size={16} />
                    Foto uploaden
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { handleAvatarUpload(player, e.target.files[0]); e.target.value = '' }}
                    />
                  </label>
                </div>
                {player.avatar_url && (
                  <button
                    onClick={() => handleAvatarDelete(player)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors text-left"
                  >
                    Foto verwijderen
                  </button>
                )}
              </div>
            )}

            {avatarSaved[player.id] && (
              <p className="text-xs text-green-600 font-medium mt-2">Foto opgeslagen ✓</p>
            )}
            {avatarError[player.id] && (
              <p className="text-xs text-red-500 mt-2">{avatarError[player.id]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
