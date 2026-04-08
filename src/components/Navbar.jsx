import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sun, Moon, Shield, BookOpen, Wrench, Home, Tag, BarChart2, Menu, X, ArrowLeft, Info } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useEffect, useState, useRef, useContext } from 'react'
import { InfoPanelContext } from '../lib/infoPanelContext'
import styles from './Navbar.module.css'

const DAYS = [
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'sabado',    label: 'Sábado'    },
  { key: 'domingo',   label: 'Domingo'   },
]

function getDefaultDay() {
  const today = new Date().getDay()
  if (today === 3) return 'miercoles'
  if (today === 4 || today === 5) return 'sabado'
  if (today === 6) return 'sabado'
  if (today === 0) return 'domingo'
  return 'miercoles'
}

export default function Navbar({ theme, toggleTheme }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const menuRef = useRef(null)
  const isHome = location.pathname === '/' || location.pathname.startsWith('/repertorio')
  const isCanciones = location.pathname === '/canciones'
  const isSongPage = location.pathname.startsWith('/cancion/')
  const { showPanel, setShowPanel, songTitle, songBand, devMode, toggleDevMode, hasUnsavedChanges, saveMeta } = useContext(InfoPanelContext)

  const [selectedDay, setSelectedDay] = useState(
    () => localStorage.getItem('repertorio_day') || getDefaultDay()
  )

  useEffect(() => {
    const dayFromUrl = location.pathname.split('/repertorio/')[1]
    if (dayFromUrl && DAYS.find(d => d.key === dayFromUrl)) {
      setSelectedDay(dayFromUrl)
      localStorage.setItem('repertorio_day', dayFromUrl)
    }
  }, [location.pathname])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(!!data.session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAdmin(!!session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  function toggleView() {
    if (isHome) navigate('/canciones')
    else navigate('/')
  }

  function cycleDay() {
    const currentIdx = DAYS.findIndex(d => d.key === selectedDay)
    const nextIdx = (currentIdx + 1) % DAYS.length
    const newDay = DAYS[nextIdx].key
    localStorage.setItem('repertorio_day', newDay)
    navigate(`/repertorio/${newDay}`)
  }

  const currentDayLabel = DAYS.find(d => d.key === selectedDay)?.label || 'Día'

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }

    if (!menuOpen) return

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <nav className={styles.nav}>
      {isSongPage ? (
        <button
          onClick={() => {
            setShowPanel(false)
            const params = new URLSearchParams(location.search)
            if (params.get('ssl')) {
              window.location.href = '/repertorio'
            } else {
              navigate(-1)
            }
          }}
          className={styles.backBtn}
          title="Volver"
        >
          <ArrowLeft size={22} />
        </button>
      ) : (
        <button onClick={toggleView} className={styles.toggleBtn} title={isHome ? 'Ir a Canciones' : 'Ir a Repertorio'}>
          {isHome ? <BookOpen size={22} /> : <Home size={22} />}
        </button>
      )}

      {isHome && !isSongPage && (
        <button onClick={cycleDay} className={styles.dayBtn} title="Cambiar día">
          {currentDayLabel}
        </button>
      )}

      {isSongPage && (
        <div className={styles.songInfo}>
          <div className={styles.songTitle}>{songTitle}</div>
          {songBand && <div className={styles.songBand}>{songBand}</div>}
        </div>
      )}

      {isSongPage ? (
        <button
          className={`${styles.infoBtnNav} ${showPanel ? styles.active : ''} ${hasUnsavedChanges ? styles.unsaved : ''}`}
          onClick={() => {
            if (hasUnsavedChanges && saveMeta) {
              saveMeta()
            } else {
              setShowPanel(v => !v)
            }
          }}
          title={hasUnsavedChanges ? "Guardar cambios" : "Información de la canción"}
        >
          <Info size={20} />
        </button>
      ) : (
        <div className={styles.menu} ref={menuRef} onClick={e => e.stopPropagation()}>
          <button onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }} className={styles.menuBtn} title="Menú">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {menuOpen && (
            <div className={styles.menuDropdown}>
              <Link to="/estadisticas" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
                <BarChart2 size={16} /> Estadísticas
              </Link>
              <Link to="/asignar-bandas" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
                <Tag size={16} /> Asignar bandas
              </Link>
              <button onClick={() => { toggleDevMode(!devMode); setMenuOpen(false) }} className={styles.menuItem} title="Toggle doble-click editar">
                <Wrench size={16} /> Dev {devMode ? '✓' : ''}
              </button>
              <button onClick={() => { toggleTheme(); setMenuOpen(false) }} className={styles.menuItem}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
              </button>
              <hr className={styles.menuDivider} />
              {isAdmin ? (
                <Link to="/admin" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
                  <Shield size={16} /> Admin
                </Link>
              ) : (
                <Link to="/login" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
                  <Shield size={16} /> Login
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
