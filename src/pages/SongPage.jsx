import { useState, useEffect, useContext, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Music2, AlignLeft, ChevronUp, ChevronDown, Check, Pencil, Eye, Expand, Minimize2, AlertTriangle, Bookmark, Settings2, Info } from 'lucide-react'
import { getSong, getSongs, createSong, updateSong, updateSetlistSong, useAdmin } from '../lib/api'
import { transposeLine, transposeNote, isChordLine } from '../lib/chords'
import { getCachedSong, updateCachedSong } from '../lib/songCache'
import { InfoPanelContext } from '../lib/infoPanelContext'
import styles from './SongPage.module.css'
import { KEYS, SPEED_VALUES as SPEEDS } from '../lib/constants'

export default function SongPage() {
  const isAdmin = useAdmin()
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const setlistSongId = searchParams.get('ssl')
  const initialTranspose = parseInt(searchParams.get('t') || '0')

  // Datos parciales que puede traer SetlistPage (title, key, speed) para mostrar de inmediato
  const seedSong = location.state?.song || null

  const [song, setSong] = useState(seedSong)
  const [loading, setLoading] = useState(!seedSong)       // false si ya tenemos seed
  const [contentLoading, setContentLoading] = useState(!!seedSong) // cargando contenido en bg
  const [showChords, setShowChords] = useState(true)
  const [transpose, setTranspose] = useState(initialTranspose)
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('song_fontSize') || '15'))
  const seedMeta = seedSong
    ? { title: seedSong.title || '', key: seedSong.key || '', speed: seedSong.speed || '', bpm: '', band: '' }
    : {}
  const [meta, setMeta] = useState(seedMeta)
  const [bands, setBands] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [originalMeta, setOriginalMeta] = useState(seedMeta)
  const [presentationMode, setPresentationMode] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const { showPanel, setShowPanel, setSongTitle, setSongBand, devMode, editMode: contextEditMode, setEditMode: setContextEditMode, hasUnsavedChanges, setHasUnsavedChanges, setSaveMeta } = useContext(InfoPanelContext)
  const [isPractice, setIsPractice] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('practice_list') || '[]')).has(id) }
    catch { return false }
  })
  const [nextSong, setNextSong] = useState(null)
  const [prevSong, setPrevSong] = useState(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    window.scrollTo(0, 0)
    setNextSong(null)
    setPrevSong(null)
    setShowPanel(false)
    fetchSong()
    fetchBands()

    // En background, actualiza si hay cambios
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        fetchSong(true)
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [id])

  useEffect(() => {
    loadSetlistNavigation()
  }, [id, setlistSongId])

  function loadSetlistNavigation() {
    if (!setlistSongId) return
    try {
      const cached = sessionStorage.getItem('setlist_cache')
      const day = sessionStorage.getItem('setlist_day')
      if (!cached || !day) return

      let data
      try {
        data = JSON.parse(cached)
      } catch (e) {
        console.warn('[SongPage] Cache corrupted, cannot parse JSON:', e.message)
        return
      }

      if (!data.setlists || typeof data.setlists !== 'object') {
        console.warn('[SongPage] Cache missing .setlists property')
        return
      }

      const currentSetlist = data.setlists[day]
      if (!currentSetlist) {
        console.warn(`[SongPage] No setlist found for day: ${day}`)
        return
      }

      const songs = currentSetlist.songs || []
      const currentIdx = songs.findIndex(s => s.id === setlistSongId)
      if (currentIdx === -1) {
        console.warn(`[SongPage] Song ${setlistSongId} not found in setlist for ${day}`)
        return
      }

      if (currentIdx > 0) setPrevSong(songs[currentIdx - 1])
      if (currentIdx < songs.length - 1) setNextSong(songs[currentIdx + 1])
    } catch (e) {
      console.error('[SongPage] Unexpected error in loadSetlistNavigation:', e)
    }
  }

  useEffect(() => {
    if (song) {
      setSongTitle(song.title || '')
      setSongBand(song.band || '')
    }
    return () => {
      setSongTitle('')
      setSongBand('')
    }
  }, [song])

  async function fetchSong(silent = false) {
    // Revisar caché primero (puede estar lista si venimos del setlist)
    const cached = getCachedSong(id)
    if (!silent) {
      if (cached) {
        const m = { title: cached.title || '', key: cached.key || '', speed: cached.speed || '', bpm: cached.bpm || '', band: cached.band || '' }
        setSong(cached)
        setMeta(m)
        setOriginalMeta(m)
        setEditContent(cached.content || '')
        setLoading(false)
        setContentLoading(false)
      } else if (!seedSong) {
        setLoading(true)
      }
    }

    try {
      const data = await getSong(id)
      if (data) {
        const m = { title: data?.title || '', key: data?.key || '', speed: data?.speed || '', bpm: data?.bpm || '', band: data?.band || '' }
        setSong(data)
        setMeta(m)
        setOriginalMeta(m)
        setEditContent(data?.content || '')
      }
    } catch (err) {
      console.error('Error fetching song:', err)
    } finally {
      setLoading(false)
      setContentLoading(false)
    }
  }

  async function fetchBands() {
    const data = await getSongs('band')
    const unique = [...new Set((data || []).map(s => s.band).filter(Boolean))].sort()
    setBands(unique)
  }

  async function duplicateTransposed() {
    if (transpose === 0) { alert('El tono actual es el mismo que el original — sube o baja semitonos primero.'); return }
    if (!confirm(`¿Guardar una copia de "${song.title}" con el contenido ya transpuesto ${transpose > 0 ? '+' : ''}${transpose} semitonos? La original no cambia.`)) return
    setDuplicating(true)
    const newContent = song.content
      ? song.content.split('\n').map(line => {
          const trimmed = line.trim()
          if (!trimmed) return line
          if (/^(INTRO|VERSO|PRE|CORO|PUENTE|OUTRO|BRIDGE|CHORUS|VERSE|ESTROFA|FINAL|FIN)/i.test(trimmed)) return line
          if (isChordLine(trimmed)) return transposeLine(line, transpose)
          return line
        }).join('\n')
      : ''
    const newKey = song.key ? transposeNote(song.key, transpose) : null
    try {
      await createSong({ title: song.title, key: newKey, speed: song.speed, bpm: song.bpm, band: song.band, is_mvi: song.is_mvi, content: newContent })
    } catch {
      setDuplicating(false)
      alert('Error al duplicar')
      return
    }
    setDuplicating(false)
    alert(`Copia guardada${newKey ? ` en ${newKey}` : ''}. Búscala en la lista de canciones.`)
  }

  function togglePractice() {
    try {
      const list = new Set(JSON.parse(localStorage.getItem('practice_list') || '[]'))
      if (list.has(id)) list.delete(id)
      else list.add(id)
      localStorage.setItem('practice_list', JSON.stringify([...list]))
      setIsPractice(list.has(id))
    } catch {}
  }

  async function toggleError() {
    const next = !song.has_error
    setSong(s => ({ ...s, has_error: next }))
    updateCachedSong(id, { has_error: next })
    // Actualizar has_error dentro del setlist_cache sin borrarlo
    try {
      const raw = sessionStorage.getItem('setlist_cache')
      if (raw) {
        const cached = JSON.parse(raw)
        Object.values(cached.setlists).forEach(sl => {
          sl.songs?.forEach(item => {
            if (item.song?.id === id) item.song.has_error = next
          })
        })
        sessionStorage.setItem('setlist_cache', JSON.stringify(cached))
      }
    } catch {}
    await updateSong(id, { has_error: next })
  }

  async function changeTranspose(newVal) {
    setTranspose(newVal)
    if (setlistSongId) {
      await updateSetlistSong(null, setlistSongId, { transpose: newVal })
    }
  }

  const saveMeta = useCallback(async () => {
    try {
      sessionStorage.removeItem('home_songs')
      sessionStorage.removeItem('home_songs_content')
      sessionStorage.removeItem('setlist_cache')
      setSaving(true)
      await updateSong(id, {
        title: meta.title || song.title,
        key:   meta.key   || null,
        speed: meta.speed || null,
        bpm:     meta.bpm     || null,
        band:    meta.band    || null,
        content: editContent,
      })

      setSaving(false)
      setSaved(true)
      setSong(s => ({ ...s, ...meta, content: editContent }))
      setOriginalMeta({ ...meta })
      updateCachedSong(id, { ...meta, content: editContent })
      setEditMode(false)
      setShowPanel(false)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Error guardando:', err)
      setSaving(false)
      alert('Error al guardar cambios')
    }
  }, [id, meta, editContent])

  const hasChanges = song ? (
    editContent !== (song.content || '') ||
    Object.keys(meta).some(k => meta[k] !== (originalMeta[k] || ''))
  ) : false

  useEffect(() => {
    setHasUnsavedChanges(hasChanges && editMode)
    setSaveMeta(() => saveMeta)
  }, [hasChanges, editMode, saveMeta])

  const shouldBlock = editMode && hasChanges

  // Avisar si el usuario cierra o recarga el tab con cambios sin guardar
  useEffect(() => {
    if (!shouldBlock) return
    const handler = e => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [shouldBlock])


  if (loading) return <div className={styles.loading}>Cargando...</div>
  if (!song) return <div className={styles.loading}>Canción no encontrada</div>

  const lines = song.content ? song.content.split('\n') : []

  function renderLine(line, index) {
    const trimmed = line.trim()

    // Empty line
    if (!trimmed) return <div key={index} className={styles.emptyLine} />

    // Section header
    if (/^(INTRO|VERSO|PRE|CORO|PUENTE|OUTRO|BRIDGE|CHORUS|VERSE|ESTROFA|FINAL|FIN)/i.test(trimmed)) {
      return <div key={index} className={styles.section}>{trimmed}</div>
    }

    // Check if chord line (heuristic: mostly chord tokens)
    const isChordLineResult = isChordLine(trimmed)

    if (isChordLineResult) {
      if (!showChords) return null
      const transposed = transpose !== 0 ? transposeLine(line, transpose) : line
      return <div key={index} className={styles.chordLine} style={{ fontSize }}>{transposed}</div>
    }

    return <div key={index} className={styles.lyricLine} style={{ fontSize }}>{showChords ? line : trimmed}</div>
  }

  return (
    <div className={styles.container}>

      {showPanel && (
        <div className={styles.infoPanel}>
          <input
            className={styles.titleInput}
            value={meta.title ?? song.title}
            onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
          />

          <div className={styles.metaRow}>
          {/* Metadata */}
          <select
            className={`${styles.metaInput} ${!meta.key ? styles.empty : ''}`}
            value={meta.key}
            onChange={e => setMeta(m => ({ ...m, key: e.target.value }))}
          >
            <option value="">+ Tono</option>
            {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>

          <select
            className={`${styles.metaInput} ${!meta.speed ? styles.empty : ''}`}
            value={meta.speed}
            onChange={e => setMeta(m => ({ ...m, speed: e.target.value }))}
          >
            <option value="">+ Velocidad</option>
            {SPEEDS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <input
            type="number"
            min="1"
            max="300"
            className={`${styles.metaInput} ${!meta.bpm ? styles.empty : ''}`}
            value={meta.bpm}
            onChange={e => setMeta(m => ({ ...m, bpm: e.target.value }))}
            placeholder="+ BPM"
            style={{ width: 72 }}
          />

          {/* Separador visual */}
          <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 6px' }} />

          {/* Controles */}
          <button className={styles.ctrl} onClick={() => setFontSize(f => { const n = Math.max(11, f - 1); localStorage.setItem('song_fontSize', n); return n })} title="Disminuir tamaño">A-</button>
          <button className={styles.ctrl} onClick={() => setFontSize(f => { const n = Math.min(24, f + 1); localStorage.setItem('song_fontSize', n); return n })} title="Aumentar tamaño">A+</button>

          <button className={styles.ctrl} onClick={() => changeTranspose(transpose - 1)} title="Bajar tono"><ChevronDown size={14} /></button>
          <span className={styles.transposeVal}>{transpose > 0 ? `+${transpose}` : transpose === 0 ? '0' : transpose}</span>
          <button className={styles.ctrl} onClick={() => changeTranspose(transpose + 1)} title="Subir tono"><ChevronUp size={14} /></button>

          {!editMode && (
            <button className={`${styles.toggle} ${showChords ? styles.active : ''}`} onClick={() => setShowChords(v => !v)} title="Mostrar/ocultar acordes">
              {showChords ? <Music2 size={13} /> : <AlignLeft size={13} />}
            </button>
          )}

          <button className={`${styles.toggle} ${editMode ? styles.active : ''}`} onClick={() => setEditMode(v => !v)} title="Editar letra">
            {editMode ? <Eye size={13} /> : <Pencil size={13} />}
          </button>
          </div>
        </div>
      )}

      {contentLoading ? (
        <div className={styles.loading}>Cargando letra...</div>
      ) : editMode ? (
        <textarea
          className={styles.editArea}
          value={editContent}
          onChange={e => setEditContent(e.target.value)}
          spellCheck={false}
        />
      ) : (
        <>
          <div
            className={styles.content}
            onDoubleClick={() => {
              if (devMode && isAdmin) {
                setEditMode(true)
                setShowPanel(true)
              }
            }}
            title={devMode ? "Double-click para editar" : ""}
          >
            {lines.map((line, i) => renderLine(line, i))}
          </div>

          {(prevSong || nextSong) && (
            <div className={styles.navigationButtons}>
              {prevSong ? (
                <button
                  className={styles.navBtn}
                  onClick={() => { sessionStorage.setItem('setlist_day', sessionStorage.getItem('setlist_day')); navigate(`/cancion/${prevSong.song.id}?ssl=${prevSong.id}&t=${prevSong.transpose || 0}`, { state: { song: prevSong.song }, replace: true }) }}
                  title="Anterior"
                >
                  ← {prevSong.song.title}
                </button>
              ) : (
                <button
                  className={styles.navMarker}
                  onClick={() => navigate('/repertorio')}
                  title="Volver a playlist"
                >
                  Inicio
                </button>
              )}

              {nextSong ? (
                <button
                  className={styles.navBtn}
                  onClick={() => { sessionStorage.setItem('setlist_day', sessionStorage.getItem('setlist_day')); navigate(`/cancion/${nextSong.song.id}?ssl=${nextSong.id}&t=${nextSong.transpose || 0}`, { state: { song: nextSong.song }, replace: true }) }}
                  title="Siguiente"
                >
                  {nextSong.song.title} →
                </button>
              ) : (
                <button
                  className={styles.navMarker}
                  onClick={() => navigate('/repertorio')}
                  title="Volver a playlist"
                >
                  Fin
                </button>
              )}
            </div>
          )}
        </>
      )}

      {presentationMode && (
        <div className={styles.presentationOverlay}>
          <button
            className={styles.presentationExit}
            onClick={() => setPresentationMode(false)}
            title="Salir de presentación"
          >
            <Minimize2 size={20} />
          </button>
          <div className={styles.presentationTitle}>{song.title}</div>
          <div className={styles.presentationContent}>
            {lines.map((line, i) => {
              const trimmed = line.trim()
              if (!trimmed) return <div key={i} className={styles.presentationEmpty} />
              if (/^(INTRO|VERSO|PRE|CORO|PUENTE|OUTRO|BRIDGE|CHORUS|VERSE|ESTROFA|FINAL|FIN)/i.test(trimmed)) {
                return <div key={i} className={styles.presentationSection}>{trimmed}</div>
              }
              if (isChordLine(trimmed)) return null
              return <div key={i} className={styles.presentationLyric}>{trimmed}</div>
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Use isChordLine from lib/chords instead
