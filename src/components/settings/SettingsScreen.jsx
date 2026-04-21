import { useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function SettingsScreen({ players, onPlayersUpdated }) {
  const [names, setNames] = useState(() =>
    Object.fromEntries(players.map((p) => [p.id, p.name]))
  )
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})

  const handleSave = async (player) => {
    const newName = names[player.id].trim()
    if (!newName || newName === player.name) return

    setSaving((s) => ({ ...s, [player.id]: true }))
    const { error } = await supabase
      .from('players')
      .update({ name: newName })
      .eq('id', player.id)

    if (!error) {
      const updatedPlayers = players.map((p) =>
        p.id === player.id ? { ...p, name: newName } : p
      )
      onPlayersUpdated(updatedPlayers)
      setSaved((s) => ({ ...s, [player.id]: true }))
      setTimeout(() => setSaved((s) => ({ ...s, [player.id]: false })), 2000)
    }
    setSaving((s) => ({ ...s, [player.id]: false }))
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <h2 className="text-xl font-bold text-gray-900 mb-1 pt-2">Instellingen</h2>
      <p className="text-sm text-gray-500 mb-6">Namen aanpassen</p>

      <div className="card space-y-4">
        {players.map((player) => (
          <div key={player.id} className="flex items-center gap-3">
            <input
              type="text"
              value={names[player.id]}
              onChange={(e) => setNames((n) => ({ ...n, [player.id]: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSave(player)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => handleSave(player)}
              disabled={saving[player.id] || names[player.id].trim() === player.name}
              className="btn-primary text-sm shrink-0 disabled:opacity-40"
            >
              {saving[player.id] ? '...' : saved[player.id] ? '✓ Opgeslagen' : 'Opslaan'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
