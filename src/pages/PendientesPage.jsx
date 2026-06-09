import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSongs } from '../lib/api'
import { AlertTriangle, Music2, Gauge, Zap, Hash } from 'lucide-react'
import styles from './PendientesPage.module.css'

const GRUPOS = [
  {
    key:   'has_error',
    label: 'Acordes con error',
    icon:  AlertTriangle,
    color: '#e05555',
    check: s => s.has_error,
    desc:  'El parser detectó errores en los acordes',
  },
  {
    key:   'sin_acordes',
    label: 'Sin acordes',
    icon:  Music2,
    color: '#f59e0b',
    check: s => !s.has_error && (!s.content || !s.content.trim()),
    desc:  'No tienen letra ni acordes cargados',
  },
  {
    key:   'sin_tono',
    label: 'Sin tonalidad',
    icon:  Hash,
    color: '#8b5cf6',
    check: s => !s.key,
    desc:  'Falta el campo de tono/key',
  },
  {
    key:   'sin_bpm',
    label: 'Sin BPM',
    icon:  Gauge,
    color: '#06b6d4',
    check: s => !s.bpm,
    desc:  'Falta el tempo en BPM',
  },
  {
    key:   'sin_velocidad',
    label: 'Sin velocidad',
    icon:  Zap,
    color: '#10b981',
    check: s => !s.speed,
    desc:  'Falta lenta / intermedia / rápida',
  },
]

export default function PendientesPage() {
  const [songs,   setSongs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [open,    setOpen]    = useState({})

  useEffect(() => {
    getSongs().then(data => { setSongs(data || []); setLoading(false) })
  }, [])

  if (loading) return <div className={styles.loading}>Cargando...</div>

  const grupos = GRUPOS.map(g => ({
    ...g,
    songs: songs.filter(g.check).sort((a, b) => a.title.localeCompare(b.title)),
  })).filter(g => g.songs.length > 0)

  const total = new Set(grupos.flatMap(g => g.songs.map(s => s.id))).size

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pendientes</h1>
        <span className={styles.badge}>{total} canciones</span>
      </div>

      {grupos.length === 0 ? (
        <div className={styles.empty}>🎉 Todo al día, no hay pendientes</div>
      ) : (
        grupos.map(g => {
          const Icon = g.icon
          const isOpen = open[g.key] !== false  // abierto por default
          return (
            <div key={g.key} className={styles.group}>
              <button
                className={styles.groupHeader}
                onClick={() => setOpen(o => ({ ...o, [g.key]: !isOpen }))}
                style={{ '--group-color': g.color }}
              >
                <Icon size={16} style={{ color: g.color, flexShrink: 0 }} />
                <span className={styles.groupLabel}>{g.label}</span>
                <span className={styles.groupCount}>{g.songs.length}</span>
                <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
              </button>
              <p className={styles.groupDesc}>{g.desc}</p>

              {isOpen && (
                <div className={styles.songList}>
                  {g.songs.map(s => (
                    <Link key={s.id} to={`/cancion/${s.id}`} className={styles.songItem}>
                      <span className={styles.songTitle}>{s.title}</span>
                      <div className={styles.songMeta}>
                        {s.key   && <span className={styles.tag}>{s.key}</span>}
                        {s.band  && <span className={styles.tag}>{s.band}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
