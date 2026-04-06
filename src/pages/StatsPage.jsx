import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Music, Users, Hash, Zap, AlertCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import styles from './StatsPage.module.css'

export default function StatsPage() {
  const [songs, setSongs] = useState([])
  const [setlistSongs, setSetlistSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAllBands, setShowAllBands] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const [{ data: s }, { data: ss }] = await Promise.all([
        supabase.from('songs').select('id, title, key, speed, band'),
        supabase.from('setlist_songs').select('song_id, setlist:setlist_id(day)'),
      ])
      setSongs(s || [])
      setSetlistSongs(ss || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className={styles.loading}>Cargando...</div>

  const total = songs.length

  // Por artista
  const byBand = {}
  songs.forEach(s => {
    const b = s.band || '— Sin artista'
    byBand[b] = (byBand[b] || 0) + 1
  })
  const bandList = Object.entries(byBand).sort((a, b) => b[1] - a[1])
  const maxBand = bandList[0]?.[1] || 1

  // Por tonalidad
  const byKey = {}
  songs.forEach(s => { if (s.key) byKey[s.key] = (byKey[s.key] || 0) + 1 })
  const keyList = Object.entries(byKey).sort((a, b) => b[1] - a[1])
  const maxKey = keyList[0]?.[1] || 1

  // Por velocidad
  const speeds = { rapida: 0, intermedia: 0, lenta: 0 }
  songs.forEach(s => { if (s.speed) speeds[s.speed]++ })
  const speedLabels = { rapida: 'Rápida', intermedia: 'Intermedia', lenta: 'Lenta' }
  const speedColors = { rapida: '#e67e22', intermedia: '#3498db', lenta: '#9b59b6' }

  // Sin clasificar
  const sinBanda   = songs.filter(s => !s.band).length
  const sinTono    = songs.filter(s => !s.key).length
  const sinVeloc   = songs.filter(s => !s.speed).length

  // Más en repertorio
  const freq = {}
  setlistSongs.forEach(ss => {
    freq[ss.song_id] = (freq[ss.song_id] || 0) + 1
  })
  const topSongs = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ song: songs.find(s => s.id === id), count }))
    .filter(x => x.song)
  const maxTop = topSongs[0]?.count || 1

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Estadísticas</h1>

      {/* Totales */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <Music size={22} className={styles.cardIcon} />
          <div className={styles.cardNum}>{total}</div>
          <div className={styles.cardLabel}>Canciones totales</div>
        </div>
        <div className={styles.card}>
          <Users size={22} className={styles.cardIcon} />
          <div className={styles.cardNum}>{Object.keys(byBand).filter(b => b !== '— Sin artista').length}</div>
          <div className={styles.cardLabel}>Artistas</div>
        </div>
        <div className={styles.card}>
          <Hash size={22} className={styles.cardIcon} />
          <div className={styles.cardNum}>{keyList.length}</div>
          <div className={styles.cardLabel}>Tonalidades usadas</div>
        </div>
        <div className={styles.card}>
          <AlertCircle size={22} className={styles.cardIcon} />
          <div className={styles.cardNum}>{sinBanda + sinTono + sinVeloc}</div>
          <div className={styles.cardLabel}>Datos faltantes</div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Por artista */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><Users size={16} /> Por artista</h2>
          <div className={styles.barList}>
            {(showAllBands ? bandList : bandList.slice(0, 10)).map(([band, count]) => (
              <div key={band} className={styles.barRow}>
                <span className={styles.barLabel}>{band}</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${(count / maxBand) * 100}%` }} />
                </div>
                <span className={styles.barCount}>{count}</span>
              </div>
            ))}
          </div>
          {bandList.length > 10 && (
            <button className={styles.showMoreBtn} onClick={() => setShowAllBands(v => !v)}>
              {showAllBands
                ? <><ChevronUp size={14} /> Ver menos</>
                : <><ChevronDown size={14} /> Ver todos ({bandList.length})</>}
            </button>
          )}
        </div>

        {/* Por tonalidad */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><Hash size={16} /> Por tonalidad</h2>
          <div className={styles.barList}>
            {keyList.map(([key, count]) => (
              <div key={key} className={styles.barRow}>
                <span className={styles.barLabel}>{key}</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${(count / maxKey) * 100}%` }} />
                </div>
                <span className={styles.barCount}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Por velocidad */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><Zap size={16} /> Por velocidad</h2>
          <div className={styles.speedGrid}>
            {Object.entries(speeds).map(([key, count]) => (
              <div key={key} className={styles.speedCard} style={{ borderColor: speedColors[key] }}>
                <div className={styles.speedNum} style={{ color: speedColors[key] }}>{count}</div>
                <div className={styles.speedLabel}>{speedLabels[key]}</div>
                <div className={styles.speedPct}>{total ? Math.round(count / total * 100) : 0}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sin clasificar */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><AlertCircle size={16} /> Sin clasificar</h2>
          <div className={styles.missingList}>
            <div className={styles.missingRow}>
              <span className={styles.missingLabel}>Sin artista</span>
              <span className={styles.missingNum}>{sinBanda}</span>
            </div>
            <div className={styles.missingRow}>
              <span className={styles.missingLabel}>Sin tonalidad</span>
              <span className={styles.missingNum}>{sinTono}</span>
            </div>
            <div className={styles.missingRow}>
              <span className={styles.missingLabel}>Sin velocidad</span>
              <span className={styles.missingNum}>{sinVeloc}</span>
            </div>
          </div>
        </div>

        {/* Más en repertorio */}
        {topSongs.length > 0 && (
          <div className={`${styles.section} ${styles.fullCol}`}>
            <h2 className={styles.sectionTitle}><Calendar size={16} /> Más usadas en repertorio</h2>
            <div className={styles.barList}>
              {topSongs.map(({ song, count }) => (
                <div key={song.id} className={styles.barRow}>
                  <span className={styles.barLabel}>{song.title}</span>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${(count / maxTop) * 100}%` }} />
                  </div>
                  <span className={styles.barCount}>{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
