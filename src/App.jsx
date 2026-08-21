import { useState, useEffect, useCallback } from 'react'
import { User } from 'lucide-react'
import { supabase, subscribeToSessions, preloadAvatars, syncAchievements } from './supabaseClient'
import LoadingSpinner from './components/shared/LoadingSpinner'
import AchievementToasts from './components/shared/AchievementToasts'
import HomeScreen from './components/home/HomeScreen'
import ActiveSessionScreen from './components/session/ActiveSessionScreen'
import EndSessionScreen from './components/session/EndSessionScreen'
import InsightsScreen from './components/insights/InsightsScreen'
import SettingsScreen from './components/settings/SettingsScreen'
import EditSessionScreen from './components/session/EditSessionScreen'

export default function App() {
  const [players, setPlayers] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [loading, setLoading] = useState(true)
  const [endedSession, setEndedSession] = useState(null)
  const [editedSession, setEditedSession] = useState(null)
  const [showSplash, setShowSplash] = useState(false)
  const [pendingEndSession, setPendingEndSession] = useState(null)
  const [newAchievements, setNewAchievements] = useState([])
  const [toasts, setToasts] = useState([])

  const loadInitialData = useCallback(async () => {
    const [{ data: playersData }, { data: activeData }] = await Promise.all([
      supabase.from('players').select('*').order('name'),
      supabase.from('sessions').select('*').eq('is_active', true).limit(1).maybeSingle(),
    ])

    // Diagnostiek: log avatar status en storage bucket
    console.log('[avatar] players:', playersData?.map(p => ({ id: p.id, name: p.name, avatar_url: p.avatar_url })))
    supabase.storage.from('avatars').list().then(({ data: files, error }) => {
      console.log('[avatar] storage bucket bestanden:', files, 'error:', error)
    })

    setPlayers(playersData ?? [])
    preloadAvatars(playersData ?? [])
    setActiveSession(activeData ?? null)
    if (activeData) setActiveTab('active')
    setLoading(false)
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  useEffect(() => {
    const unsub = subscribeToSessions(async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      setActiveSession(data ?? null)
      if (data) setActiveTab('active')
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!showSplash) return
    const timer = setTimeout(() => {
      setShowSplash(false)
      setEndedSession(pendingEndSession)
      setPendingEndSession(null)
    }, 3000)
    return () => clearTimeout(timer)
  }, [showSplash, pendingEndSession])

  const handleSessionCreated = (session) => {
    setActiveSession(session)
    setEndedSession(null)
    setEditedSession(null)
    setActiveTab('active')
  }

  const handleSessionEnd = (session) => {
    setPendingEndSession(session)
    setActiveSession(null)
    setShowSplash(true)
    setActiveTab('active')
    setNewAchievements([])

    syncAchievements(players).then((newly) => {
      if (newly.length === 0) return
      setNewAchievements(newly)
      setToasts((prev) => [
        ...prev,
        ...newly.map((a) => ({ id: `${a.player_id}-${a.achievement_key}`, icon: a.icon, playerName: a.playerName, label: a.label })),
      ])
    })
  }

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const handleBackToHome = () => {
    setEndedSession(null)
    setNewAchievements([])
    setActiveTab('home')
  }

  const handleEditSession = (session) => {
    setEditedSession(session)
    setEndedSession(null)
    setActiveTab('active')
  }

  const handleDoneEditing = () => {
    setEditedSession(null)
    setActiveTab('home')
  }

  const handleReactivate = async (session) => {
    await supabase.from('sessions').update({ is_active: true, is_completed: false }).eq('id', session.id)
    setActiveSession({ ...session, is_active: true, is_completed: false })
    setEndedSession(null)
    setActiveTab('active')
  }

  if (loading) return <LoadingSpinner />

  const hasActiveContent = !!(activeSession || endedSession || editedSession)

  const tabs = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'active', icon: '🎾', label: 'Actief', disabled: !hasActiveContent },
    { id: 'insights', icon: '📊', label: 'Inzichten' },
    { id: 'settings', icon: User, label: 'Spelersprofiel' },
  ]

  const renderContent = () => {
    if (activeTab === 'home') {
      return (
        <HomeScreen
          players={players}
          onSessionCreated={handleSessionCreated}
          onEditSession={handleEditSession}
          onPlayersUpdated={setPlayers}
          onSelectSession={(session) => {
            if (session.is_active) {
              setActiveSession(session)
              setEndedSession(null)
              setEditedSession(null)
              setActiveTab('active')
            } else {
              setEndedSession(session)
              setActiveSession(null)
              setEditedSession(null)
              setNewAchievements([])
              setActiveTab('active')
            }
          }}
        />
      )
    }

    if (activeTab === 'active') {
      if (editedSession) {
        return (
          <EditSessionScreen
            session={editedSession}
            players={players}
            onDone={handleDoneEditing}
          />
        )
      }
      if (endedSession && !activeSession) {
        return (
          <EndSessionScreen
            session={endedSession}
            players={players}
            onBack={handleBackToHome}
            onEdit={handleEditSession}
            onReactivate={handleReactivate}
            newAchievements={newAchievements}
          />
        )
      }
      if (activeSession) {
        return (
          <ActiveSessionScreen
            session={activeSession}
            players={players}
            onSessionEnd={handleSessionEnd}
            onBack={() => setActiveTab('home')}
            onPlayersUpdated={setPlayers}
          />
        )
      }
      return (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-400">
          <div>
            <div className="text-5xl mb-4">🎾</div>
            <p className="text-lg font-medium">Geen actieve sessie</p>
            <p className="text-sm mt-1">Start een nieuwe sessie via Home</p>
          </div>
        </div>
      )
    }

    if (activeTab === 'insights') {
      return <InsightsScreen players={players} onBack={() => setActiveTab('home')} />
    }

    if (activeTab === 'settings') {
      return <SettingsScreen players={players} onPlayersUpdated={setPlayers} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AchievementToasts toasts={toasts} onDismiss={dismissToast} />

      {/* Leipe Marty splash — toont 3 sec na afloop sessie */}
      {showSplash && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: '#EF7D2D' }}
        >
          <p className="text-white font-bold text-center px-8 leading-snug text-4xl">
            Deze app wordt u aangeboden<br />door leipe marty
          </p>
        </div>
      )}

      <div className="flex-1 pb-20 md:pb-0 md:pt-16 overflow-auto">
        {renderContent()}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-0 bg-white border-t md:border-t-0 md:border-b border-gray-200 z-50 flex md:px-6">
        <div className="hidden md:flex items-center px-4 mr-4 font-bold text-gray-900 text-base shrink-0">
          🎾 Padelapp voor de boys
        </div>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            className={`tab-btn md:flex-none md:flex-row md:gap-2 md:py-4 md:px-5 md:text-sm ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
          >
            {typeof tab.icon === 'string' ? (
              <span className="text-xl md:text-lg">{tab.icon}</span>
            ) : (
              <tab.icon className="w-5 h-5 md:w-[18px] md:h-[18px]" />
            )}
            <span className="mt-0.5 md:mt-0 md:font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
