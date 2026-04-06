import { Link } from 'react-router-dom'
import { Sun, Moon, Music2, Shield, BookOpen, Wrench, Home, Tag, BarChart2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'
import styles from './Navbar.module.css'

export default function Navbar({ theme, toggleTheme }) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(!!data.session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAdmin(!!session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        <Music2 size={22} />
        <span>AFC</span>
      </Link>

      <div className={styles.center}>
        <Link to="/" className={styles.iconBtn} title="Repertorio">
          <Home size={18} />
        </Link>
        <Link to="/canciones" className={styles.iconBtn} title="Canciones">
          <BookOpen size={18} />
        </Link>
        <Link to="/estadisticas" className={styles.iconBtn} title="Estadísticas">
          <BarChart2 size={18} />
        </Link>
      </div>

      <div className={styles.actions}>
        <Link to="/asignar-bandas" className={styles.iconBtn} title="Asignar bandas">
          <Tag size={18} />
        </Link>
        <Link to="/dev" className={styles.iconBtn} title="Dev">
          <Wrench size={18} />
        </Link>
        <button onClick={toggleTheme} className={styles.iconBtn} title="Cambiar tema">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {isAdmin ? (
          <Link to="/admin" className={styles.adminBtn}>
            <Shield size={16} /> Admin
          </Link>
        ) : (
          <Link to="/login" className={styles.iconBtn} title="Admin">
            <Shield size={18} />
          </Link>
        )}
      </div>
    </nav>
  )
}
