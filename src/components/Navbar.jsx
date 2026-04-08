import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sun, Moon, Shield, BookOpen, Wrench, Home, Tag, BarChart2, Menu, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useEffect, useState, useRef } from 'react'
import styles from './Navbar.module.css'

export default function Navbar({ theme, toggleTheme }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const menuRef = useRef(null)
  const isHome = location.pathname === '/' || location.pathname.startsWith('/repertorio')
  const isCanciones = location.pathname === '/canciones'

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

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [menuOpen])

  return (
    <nav className={styles.nav}>
      <button onClick={toggleView} className={styles.toggleBtn} title={isHome ? 'Ir a Canciones' : 'Ir a Repertorio'}>
        {isHome ? <BookOpen size={22} /> : <Home size={22} />}
      </button>

      <div className={styles.menu} ref={menuRef}>
        <button onClick={() => setMenuOpen(v => !v)} className={styles.menuBtn} title="Menú">
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
            <Link to="/dev" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
              <Wrench size={16} /> Dev
            </Link>
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
    </nav>
  )
}
