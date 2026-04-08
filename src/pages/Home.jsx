import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search, Music, Zap, Minus, Waves, Pencil, X, Check, FilterX, AlertTriangle, Bookmark } from 'lucide-react'
import { supabase } from '../lib/supabase'
import styles from './Home.module.css'
import { KEYS } from '../lib/constants'

const SPEEDS = [
  { value: 'rapida',      label: 'Rápida',      icon: <Zap size={14} /> },
  { value: 'intermedia',  label: 'Intermedia',  icon: <Minus size={14} /> },
  { value: 'lenta',       label: 'Lenta',       icon: <Waves size={14} /> },
]

export default function Home() {
  const [songs, setSongs]         = useState([])
  const [search, setSearch]       = useState(() => sessionStorage.getItem('h_search') || '')
  const [filterKey, setFilterKey] = useState(() => sessionStorage.getItem('h_key')    || '')
  const [filterSpeed, setFilterSpeed] = useState(() => sessionStorage.getItem('h_speed') || '')
  const [filterBand, setFilterBand]   = useState(() => sessionStorage.getItem('h_band')  || '')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState({})
  const [saving, setSaving]       = useState(false)
  const [searchContent, setSearchContent] = useState(() => sessionStorage.getItem('h_searchContent') === 'true')
  const [filterError, setFilterError]     = useState(false)
  const [filterPractice, setFilterPractice] = useState(false)
  const [practiceIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('practice_list') || '[]')) }
    catch { return new Set() }
  })
  const abortControllerRef = useRef(null)

  useEffect(() => { fetchSongs(searchContent) }, [])
  useEffect(() => { sessionStorage.setItem('h_search', search) }, [search])
  useEffect(() => { sessionStorage.setItem('h_key',    filterKey) }, [filterKey])
  useEffect(() => { sessionStorage.setItem('h_speed',  filterSpeed) }, [filterSpeed])
  useEffect(() => { sessionStorage.setItem('h_band',   filterBand) }, [filterBand])
  useEffect(() => {
    sessionStorage.setItem('h_searchContent', searchContent)
    fetchSongs(searchContent)
  }, [searchContent])

  async function fetchSongs(withContent = false) {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    setError(null)
    const cacheKey = withContent ? 'home_songs_content' : 'home_songs'
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      setSongs(JSON.parse(cached))
      setLoading(false)
    } else {
      setLoading(true)
    }

    const fields = withContent
      ? 'id, title, key, speed, is_mvi, band, has_error, content'
      : 'id, title, key, speed, is_mvi, band, has_error'
    try {
      const { data, error } = await supabase
        .from('songs')
        .select(fields)
        .order('title')
      if (error) throw error
      setSongs(data || [])
      sessionStorage.setItem(cacheKey, JSON.stringify(data || []))
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[Home] Request cancelled')
        return
      }
      if (!cached) setError('Error al cargar. Intenta recargar la página.')
    } finally {
      setLoading(false)
    }
  }

  const bands = [...new Set(songs.map(s => s.band).filter(Boolean))].sort()

  const filtered = songs.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q
      ? true
      : s.title.toLowerCase().includes(q) ||
        (searchContent && s.content && s.content.toLowerCase().includes(q))
    const matchKey      = filterKey      ? s.key   === filterKey   : true
    const matchSpeed    = filterSpeed    ? s.speed === filterSpeed : true
    const matchBand     = filterBand     ? s.band  === filterBand  : true
    const matchError    = filterError    ? s.has_error === true    : true
    const matchPractice = filterPractice ? practiceIds.has(s.id)  : true
    return matchSearch && matchKey && matchSpeed && matchBand && matchError && matchPractice
  })

  function openEdit(e, song) {
    e.preventDefault()
    setForm({ ...song })
    setEditing(song)
  }

  function closeEdit() {
    setEditing(null)
    setForm({})
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('songs').update({
      title: form.title,
      key:   form.key   || null,
      speed: form.speed || null,
      band:  form.band  || null,
      bpm:   form.bpm   || null,
      is_mvi: form.is_mvi || false,
    }).eq('id', form.id)
    setSaving(false)
    closeEdit()
    fetchSongs()
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Music size={28} /> Canciones AFC
        </h1>
        <p className={styles.count}>{songs.length} canciones</p>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.search}
            placeholder="Buscar canción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <label className={styles.contentToggle}>
          <span
            className={`${styles.toggleTrack} ${searchContent ? styles.toggleOn : ''}`}
            onClick={() => setSearchContent(v => !v)}
            role="checkbox"
            aria-checked={searchContent}
            tabIndex={0}
            onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && setSearchContent(v => !v)}
          >
            <span className={styles.toggleThumb} />
          </span>
          <span className={styles.toggleLabel}>Buscar en letra</span>
        </label>

        <select className={styles.select} value={filterKey} onChange={e => setFilterKey(e.target.value)}>
          <option value="">Todos los tonos</option>
          {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        <select className={styles.select} value={filterBand} onChange={e => setFilterBand(e.target.value)}>
          <option value="">Todos los artistas</option>
          {bands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <div className={styles.speedBtns}>
          {SPEEDS.map(s => (
            <button
              key={s.value}
              className={`${styles.speedBtn} ${filterSpeed === s.value ? styles.active : ''}`}
              onClick={() => setFilterSpeed(filterSpeed === s.value ? '' : s.value)}
            >
              {s.icon} {s.label}
            </button>
          ))}
          <button
            className={`${styles.speedBtn} ${filterError ? styles.active : ''}`}
            onClick={() => setFilterError(v => !v)}
            style={filterError ? { background: '#e05555', borderColor: '#e05555' } : {}}
            title="Canciones con error en acordes"
          >
            <AlertTriangle size={14} /> Con errores
          </button>
          <button
            className={`${styles.speedBtn} ${filterPractice ? styles.active : ''}`}
            onClick={() => setFilterPractice(v => !v)}
            title="Mis canciones para practicar"
          >
            <Bookmark size={14} /> Para practicar
          </button>
          {(search || filterKey || filterSpeed || filterBand || filterError || filterPractice) && (
            <button
              className={styles.clearBtn}
              onClick={() => { setSearch(''); setFilterKey(''); setFilterSpeed(''); setFilterBand(''); setFilterError(false); setFilterPractice(false) }}
              title="Borrar filtros"
            >
              <FilterX size={14} /> Borrar filtros
            </button>
          )}
        </div>
      </div>


      {error ? (
        <div className={styles.loading}>
          {error}
          <button onClick={fetchSongs} style={{ marginLeft: 12 }}>Recargar</button>
        </div>
      ) : loading ? (
        <div className={styles.loading}>Cargando canciones...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>No se encontraron canciones</div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(song => (
            <div key={song.id} className={styles.cardWrap}>
              <Link to={`/cancion/${song.id}`} className={styles.card}>
                <div className={styles.cardTitle}>{song.title}</div>
                <div className={styles.cardMeta}>
                  {song.key && <span className={styles.key}>{song.key}</span>}
                  {song.speed && (
                    <span className={styles.speed}>
                      {SPEEDS.find(s => s.value === song.speed)?.icon}
                      {SPEEDS.find(s => s.value === song.speed)?.label}
                    </span>
                  )}
                  {song.band && <span className={styles.band}>{song.band}</span>}
                  {song.is_mvi && <span className={styles.mvi}>MVI</span>}
                  {song.has_error && <span className={styles.errorBadge} title="Acordes con error"><AlertTriangle size={11} /></span>}
                  {practiceIds.has(song.id) && <span className={styles.practiceBadge} title="Para practicar"><Bookmark size={11} /></span>}
                </div>
              </Link>
              <button className={styles.editBtn} onClick={e => openEdit(e, song)} title="Editar">
                <Pencil size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal edición rápida */}
      {editing && (
        <div className={styles.overlay} onClick={closeEdit}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Editar canción</h2>
              <button className={styles.closeBtn} onClick={closeEdit}><X size={18} /></button>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.fullCol}>
                <label className={styles.label}>Título</label>
                <input className={styles.input} value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div>
                <label className={styles.label}>Tonalidad</label>
                <select className={styles.input} value={form.key || ''} onChange={e => setForm(f => ({ ...f, key: e.target.value }))}>
                  <option value="">Sin tono</option>
                  {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              <div>
                <label className={styles.label}>Velocidad</label>
                <select className={styles.input} value={form.speed || ''} onChange={e => setForm(f => ({ ...f, speed: e.target.value }))}>
                  <option value="">Sin clasificar</option>
                  {SPEEDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className={styles.label}>BPM</label>
                <input className={styles.input} value={form.bpm || ''} onChange={e => setForm(f => ({ ...f, bpm: e.target.value }))} placeholder="Ej: 82" />
              </div>

              <div>
                <label className={styles.label}>Banda</label>
                <input className={styles.input} list="bands-list-home" value={form.band || ''} onChange={e => setForm(f => ({ ...f, band: e.target.value }))} placeholder="Ej: Elevation Worship" />
                <datalist id="bands-list-home">
                  {bands.map(b => <option key={b} value={b} />)}
                </datalist>
              </div>

              <div className={styles.checkRow}>
                <label className={styles.label}>
                  <input type="checkbox" checked={form.is_mvi || false} onChange={e => setForm(f => ({ ...f, is_mvi: e.target.checked }))} /> Es MVI
                </label>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeEdit}>Cancelar</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                <Check size={15} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
