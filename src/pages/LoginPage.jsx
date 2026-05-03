import { useState, useContext } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { login } from '../lib/api'
import { InfoPanelContext } from '../lib/infoPanelContext'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { toggleDevMode } = useContext(InfoPanelContext)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(password)
      toggleDevMode(true)
      const from = location.state?.from || '/'
      navigate(from)
    } catch {
      setError('Contraseña incorrecta')
    }
    setLoading(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Acceso Admin</h2>
        <form onSubmit={handleLogin} className={styles.form}>
          <input
            className={styles.input}
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.btn} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
