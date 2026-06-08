import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getSetlists, getSetlistSongs, getSongs, addSongToSetlist, removeSongFromSetlist, updateSetlistSong } from '../lib/api'
import { prefetchSong } from '../lib/songCache'
import { Plus, Trash2, X, Search, AlertTriangle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './SetlistPage.module.css'

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

export default function SetlistPage() {
  const { day: dayParam } = useParams()
  const [selectedDay, setSelectedDay] = useState(
    () => dayParam || localStorage.getItem('repertorio_day') || getDefaultDay()
  )

  useEffect(() => {
    if (dayParam && DAYS.find(d => d.key === dayParam)) {
      setSelectedDay(dayParam)
      localStorage.setItem('repertorio_day', dayParam)
    }
  }, [dayParam])

  const [setlists, setSetlists]   = useState({})
  const [allSongs, setAllSongs]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [adding, setAdding]       = useState(false)
  const [dragIdx, setDragIdx]     = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const touchDragRef = useRef(null)
  const didDragRef   = useRef(false)
  const navigate = useNavigate()
  const [search, setSearch]       = useState('')

  const currentSongs = selectedDay ? (setlists[selectedDay]?.songs || []) : []

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    const songs = selectedDay ? (setlists[selectedDay]?.songs || []) : []
    songs.forEach(item => prefetchSong(item.song.id))
  }, [selectedDay, setlists])

  function selectDay(day) {
    setSelectedDay(day)
    localStorage.setItem('repertorio_day', day)
  }

  async function fetchAll(silent = false) {
    if (!silent) {
      setError(null)
      const cached = sessionStorage.getItem('setlist_cache')
      if (cached) {
        const { setlists: sl, allSongs: s } = JSON.parse(cached)
        setSetlists(sl)
        setAllSongs(s)
        setLoading(false)
      } else {
        setLoading(true)
      }
    }

    try {
      const [sls, songs] = await Promise.all([
        getSetlists(),
        getSongs(),
      ])

      setAllSongs(songs || [])

      const result = {}
      await Promise.all((sls || []).map(async sl => {
        const items = await getSetlistSongs(sl.id)
        result[sl.day] = { id: sl.id, songs: items || [] }
      }))

      setSetlists(result)
      sessionStorage.setItem('setlist_cache', JSON.stringify({ setlists: result, allSongs: songs || [] }))
    } catch {
      setError('Error al cargar. Intenta recargar la página.')
    } finally {
      setLoading(false)
    }
  }

  function updateDay(updater) {
    setSetlists(prev => ({
      ...prev,
      [selectedDay]: { ...prev[selectedDay], songs: updater(prev[selectedDay].songs) }
    }))
  }

  async function refetchDay() {
    const sl = setlists[selectedDay]
    if (!sl) return
    const items = await getSetlistSongs(sl.id)
    setSetlists(prev => ({
      ...prev,
      [selectedDay]: { ...prev[selectedDay], songs: items || [] }
    }))
  }

  function getMaxPosition(songs) {
    if (!songs || songs.length === 0) return -1
    return Math.max(...songs.map(s => s.position ?? -1))
  }

  async function addSong(song) {
    const sl = setlists[selectedDay]
    if (!sl) return
    const maxPos = getMaxPosition(sl.songs)
    setSearch('')
    setAdding(false)
    try {
      await addSongToSetlist(sl.id, song.id, maxPos + 1)
      await refetchDay()
      fetchAll(true)
    } catch {
      alert('Error al agregar la canción')
    }
  }

  async function clearDay() {
    if (!confirm('¿Vaciar todas las canciones de este día?')) return
    const sl = setlists[selectedDay]
    if (!sl) return
    const prev = sl.songs
    updateDay(() => [])
    try {
      await Promise.all(prev.map(item => removeSongFromSetlist(sl.id, item.id)))
    } catch {
      updateDay(() => prev)
      alert('Error al vaciar el repertorio')
    }
  }

  async function removeItem(itemId) {
    const sl = setlists[selectedDay]
    const prev = sl.songs
    updateDay(songs => songs.filter(s => s.id !== itemId))
    try {
      await removeSongFromSetlist(sl.id, itemId)
    } catch {
      updateDay(() => prev)
      alert('Error al eliminar')
    }
  }

  function handleTouchStart(e, i) {
    didDragRef.current = false
    touchDragRef.current = i
    setDragIdx(i)
  }

  function handleTouchMove(e) {
    if (touchDragRef.current === null) return
    didDragRef.current = true
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const item = el?.closest('[data-drag-idx]')
    if (item) {
      const idx = parseInt(item.dataset.dragIdx)
      if (!isNaN(idx)) setDragOverIdx(idx)
    }
  }

  function handleTouchEnd() {
    if (touchDragRef.current !== null) {
      handleDrop(dragOverIdx ?? touchDragRef.current)
    }
    touchDragRef.current = null
  }

  async function handleDrop(toIndex) {
    if (dragIdx === null || dragIdx === toIndex) { setDragIdx(null); setDragOverIdx(null); return }
    const songs = [...currentSongs]
    const [moved] = songs.splice(dragIdx, 1)
    songs.splice(toIndex, 0, moved)
    const prev = currentSongs
    updateDay(() => songs)
    setDragIdx(null)
    setDragOverIdx(null)
    const sl = setlists[selectedDay]
    try {
      await Promise.all(songs.map((s, i) => updateSetlistSong(sl.id, s.id, { position: i, transpose: s.transpose || 0 })))
    } catch {
      updateDay(() => prev)
      alert('Error al reordenar')
    }
  }

  const filtered = allSongs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={styles.container}>
      {!selectedDay ? (
        <div className={styles.placeholder}>Selecciona un día para ver el repertorio</div>
      ) : error ? (
        <div className={styles.loading}>
          {error}
          <button onClick={() => fetchAll()} style={{ marginLeft: 12 }}>Recargar</button>
        </div>
      ) : loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : (
        <div className={styles.listWrap}>

          {currentSongs.length === 0 && !adding && (
            <div className={styles.empty}>No hay canciones para este día</div>
          )}

          {currentSongs.map((item, i) => (
            <div
              key={item.id}
              data-drag-idx={i}
              className={`${styles.item} ${dragOverIdx === i ? styles.dragOver : ''} ${dragIdx === i ? styles.dragging : ''}`}
              style={dragIdx !== null ? { touchAction: 'none' } : {}}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={e => { e.preventDefault(); setDragOverIdx(i) }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
              onTouchStart={e => handleTouchStart(e, i)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => { if (didDragRef.current) return; sessionStorage.setItem('setlist_day', selectedDay); navigate(`/cancion/${item.song.id}?ssl=${item.id}&t=${item.transpose || 0}`, { state: { song: item.song } }) }}
            >
              <div className={styles.itemNum}>{i + 1}</div>
              <div className={styles.itemInfo}>
                <span className={styles.itemTitle}>{item.song.title}</span>
                <div className={styles.itemMeta}>
                  {item.song.key   && <span className={styles.tag}>{item.song.key}</span>}
                  {item.song.speed && <span className={styles.tag}>{item.song.speed}</span>}
                  {item.song.has_error && <AlertTriangle size={13} color="#e05555" title="Acordes con error" />}
                </div>
              </div>
              <div className={styles.itemActions} onClick={e => e.stopPropagation()}>
                <button className={styles.removeBtn} onClick={() => removeItem(item.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          {adding ? (
            <div className={styles.searchBox}>
              <div className={styles.searchRow}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  placeholder="Buscar canción..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && filtered.length > 0 && addSong(filtered[0])}
                  autoFocus
                />
                <button className={styles.cancelSearch} onClick={() => { setAdding(false); setSearch('') }}>
                  <X size={14} />
                </button>
              </div>
              <div className={styles.searchResults}>
                {filtered.slice(0, 10).map(song => (
                  <button key={`${song.id}-${Math.random()}`} className={styles.resultItem} onClick={() => addSong(song)}>
                    <span className={styles.resultTitle}>{song.title}</span>
                    {song.key && <span className={styles.resultKey}>{song.key}</span>}
                  </button>
                ))}
                {filtered.length === 0 && <div className={styles.noResults}>Sin resultados</div>}
              </div>
            </div>
          ) : (
            <div className={styles.addRow}>
              <button className={styles.addBtn} onClick={() => setAdding(true)}>
                <Plus size={15} /> Agregar canción
              </button>
              {currentSongs.length > 0 && (
                <button className={styles.clearDayBtn} onClick={clearDay}>
                  <Trash2 size={15} /> Vaciar día
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
