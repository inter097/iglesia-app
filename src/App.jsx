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

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <BrowserRouter>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
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
    </BrowserRouter>
  )
}
