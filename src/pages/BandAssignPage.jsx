import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, X, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { getSongs, updateSong } from '../lib/api'
import styles from './BandAssignPage.module.css'

export default function BandAssignPage() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [dragId, setDragId] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [newBand, setNewBand] = useState('')
  const [extraBands, setExtraBands] = useState([])
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [allCollapsed, setAllCollapsed] = useState(false)

  function toggleAll() {
    const next = !allCollapsed
    setAllCollapsed(next)
    const map = {}
    allBands.forEach(b => { map[b] = next })
    setCollapsed(map)
  }

  useEffect(() => { fetchSongs() }, [])

  async function fetchSongs() {
    setLoading(true)
    const data = await getSongs()
    setSongs(data || [])
    setLoading(false)
  }

  const allBands = [...new Set([
    ...songs.map(s => s.band).filter(Boolean).sort(),
    ...extraBands,
  ])]

  const unassigned = songs
    .filter(s => !s.band)
    .filter(s => s.title.toLowerCase().includes(search.toLowerCase()))

  function songsByBand(band) {
    return songs.filter(s => s.band === band)
  }

  function handleDragStart(e, songId) {
    setDragId(songId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, target) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(target)
  }

  async function handleDrop(e, targetBand) {
    e.preventDefault()
    setDragOver(null)
    if (!dragId) return
    const band = targetBand || null
    await updateSong(dragId, { band })
    setSongs(prev => prev.map(s => s.id === dragId ? { ...s, band } : s))
    setDragId(null)
  }

  function addBand() {
    const name = newBand.trim()
    if (!name || allBands.includes(name)) { setNewBand(''); return }
    setExtraBands(prev => [...prev, name])
    setNewBand('')
  }

  function removeExtraBand(band) {
    setExtraBands(prev => prev.filter(b => b !== band))
  }

  if (loading) return <div className={styles.loading}>Cargando...</div>

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link to="/admin" className={styles.back}>
          <ArrowLeft size={18} /> Admin
        </Link>
        <h1 className={styles.title}>Asignar bandas</h1>
        <span className={styles.hint}>Arrastra las canciones a la banda correspondiente</span>
        <button className={styles.toggleAllBtn} onClick={toggleAll}>
          {allCollapsed ? <><ChevronDown size={14} /> Mostrar canciones</> : <><ChevronUp size={14} /> Ocultar canciones</>}
        </button>
      </div>

      <div className={styles.layout}>
      {/* Sección sin banda — columna izquierda */}
      <div className={styles.unassignedSection}>
        <div className={styles.colHead}>
          <span className={styles.colName}>Sin banda</span>
          <span className={styles.badge}>{songs.filter(s => !s.band).length}</span>
          <div className={styles.searchWrap}>
            <Search size={13} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div
          className={`${styles.dropZoneGrid} ${dragOver === '__unassigned__' ? styles.over : ''}`}
          onDragOver={e => handleDragOver(e, '__unassigned__')}
          onDragLeave={() => setDragOver(null)}
          onDrop={e => handleDrop(e, null)}
        >
          {unassigned.length === 0
            ? <p className={styles.empty}>{search ? 'Sin resultados' : 'Todas las canciones tienen banda'}</p>
            : unassigned.map(s => (
              <SongCard
                key={s.id}
                song={s}
                isDragging={dragId === s.id}
                onDragStart={handleDragStart}
                onDragEnd={() => setDragId(null)}
              />
            ))
          }
        </div>
      </div>

      {/* Bandas — derecha, en grid que se envuelve */}
      <div className={`${styles.bandsArea} ${dragId ? styles.isDragging : ''}`}>
          {allBands.map(band => {
            const bSongs = songsByBand(band)
            const isExtra = extraBands.includes(band) && bSongs.length === 0
            return (
              <div key={band} className={styles.col}>
                <div
                  className={styles.colHead}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setCollapsed(c => ({ ...c, [band]: !c[band] }))}
                >
                  <span className={styles.colName}>{band}</span>
                  <div className={styles.colHeadRight}>
                    <span className={styles.badge}>{bSongs.length}</span>
                    {collapsed[band] ? <ChevronDown size={13} style={{color:'var(--text2)'}} /> : <ChevronUp size={13} style={{color:'var(--text2)'}} />}
                    {isExtra && (
                      <button className={styles.removeBtn} onClick={() => removeExtraBand(band)}>
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>
                {!collapsed[band] && (
                  <div
                    className={`${styles.dropZone} ${dragOver === band ? styles.over : ''}`}
                    onDragOver={e => handleDragOver(e, band)}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => handleDrop(e, band)}
                  >
                    {bSongs.length === 0
                      ? <p className={styles.empty}>Arrastra aquí</p>
                      : bSongs.map(s => (
                        <SongCard
                          key={s.id}
                          song={s}
                          isDragging={dragId === s.id}
                          onDragStart={handleDragStart}
                          onDragEnd={() => setDragId(null)}
                        />
                      ))
                    }
                  </div>
                )}
                {collapsed[band] && (
                  <div
                    className={`${styles.dropZoneCollapsed} ${dragOver === band ? styles.over : ''}`}
                    onDragOver={e => handleDragOver(e, band)}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => handleDrop(e, band)}
                  />
                )}
              </div>
            )
          })}

          {/* Agregar nueva banda */}
          <div className={styles.addCol}>
            <p className={styles.addLabel}>Nueva banda</p>
            <div className={styles.addRow}>
              <input
                className={styles.addInput}
                placeholder="Nombre..."
                value={newBand}
                onChange={e => setNewBand(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addBand()}
              />
              <button className={styles.addBtn} onClick={addBand}>
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SongCard({ song, isDragging, onDragStart, onDragEnd }) {

  return (
    <div
      className={`${styles.songCard} ${isDragging ? styles.dragging : ''}`}
      draggable
      onDragStart={e => onDragStart(e, song.id)}
      onDragEnd={onDragEnd}
    >
      <span className={styles.songTitle}>{song.title}</span>
      {song.key && <span className={styles.keyBadge}>{song.key}</span>}
    </div>
  )
}
