import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Home from './pages/Home'
import SongPage from './pages/SongPage'
import AdminPage from './pages/AdminPage'
import LoginPage from './pages/LoginPage'
import SetlistPage from './pages/SetlistPage'
import DevPage from './pages/DevPage'
import BandAssignPage from './pages/BandAssignPage'
import StatsPage from './pages/StatsPage'
import Navbar from './components/Navbar'
import { InfoPanelProvider } from './lib/infoPanelContext'
import { getPendingCount } from './lib/offlineQueue'

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    const update = async () => {
      setOnline(navigator.onLine)
      setPending(await getPendingCount())
    }
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    window.addEventListener('queue-synced', update)
    update()
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      window.removeEventListener('queue-synced', update)
    }
  }, [])

  if (online && pending === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      padding: '8px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600,
      background: online ? '#16a34a' : '#dc2626', color: '#fff'
    }}>
      {!online && `Sin conexión${pending > 0 ? ` · ${pending} cambio${pending > 1 ? 's' : ''} pendiente${pending > 1 ? 's' : ''}` : ''}`}
      {online && pending > 0 && `Sincronizando ${pending} cambio${pending > 1 ? 's' : ''}...`}
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <BrowserRouter>
      <InfoPanelProvider>
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <OfflineBanner />
        <Routes>
          <Route path="/" element={<SetlistPage />} />
          <Route path="/canciones" element={<Home />} />
          <Route path="/cancion/:id" element={<SongPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/repertorio" element={<SetlistPage />} />
          <Route path="/repertorio/:day" element={<SetlistPage />} />
          <Route path="/dev" element={<DevPage />} />
          <Route path="/asignar-bandas" element={<BandAssignPage />} />
          <Route path="/estadisticas" element={<StatsPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </InfoPanelProvider>
    </BrowserRouter>
  )
}
