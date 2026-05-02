import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getSongs, getSong, createSong, updateSong, deleteSong, logout } from '../lib/api'
import { Plus, Pencil, Trash2, LogOut, X, Check, Tag } from 'lucide-react'
import styles from './AdminPage.module.css'
import { KEYS, SPEED_VALUES as SPEEDS } from '../lib/constants'

const EMPTY_SONG = { title: '', key: '', speed: '', bpm: '', content: '', is_mvi: false, band: '' }

export default function AdminPage() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_SONG)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [bands, setBands] = useState([])
  const navigate = useNavigate()

  useEffect(() => { fetchSongs() }, [])

  async function fetchSongs() {
    setLoading(true)
    const data = await getSongs('id, title, key, speed, band')
    setSongs(data || [])
    const unique = [...new Set((data || []).map(s => s.band).filter(Boolean))].sort()
    setBands(unique)
    setLoading(false)
  }

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  function openNew() {
    setForm(EMPTY_SONG)
    setEditing('new')
  }

  async function openEdit(song) {
    const data = await getSong(song.id)
    setForm(data)
    setEditing(data)
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    if (editing === 'new') {
      await createSong({ ...form })
    } else {
      await updateSong(form.id, { ...form })
    }
    setSaving(false)
    setEditing(null)
    fetchSongs()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta canción?')) return
    await deleteSong(id)
    fetchSongs()
  }

  const filtered = songs.filter(s => s.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Panel Admin</h1>
        <div className={styles.headerActions}>
          <Link to="/asignar-bandas" className={styles.bandBtn}>
            <Tag size={16} /> Asignar bandas
          </Link>
          <button className={styles.addBtn} onClick={openNew}>
            <Plus size={16} /> Nueva canción
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <input
        className={styles.search}
        placeholder="Buscar canción..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : (
        <div className={styles.list}>
          {filtered.map(song => (
            <div key={song.id} className={styles.row}>
              <span className={styles.rowTitle}>{song.title}</span>
              <div className={styles.rowMeta}>
                {song.key && <span className={styles.tag}>{song.key}</span>}
                {song.speed && <span className={styles.tag}>{song.speed}</span>}
              </div>
              <div className={styles.rowActions}>
                <button className={styles.editBtn} onClick={() => openEdit(song)}>
                  <Pencil size={15} />
                </button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(song.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editing === 'new' ? 'Nueva canción' : 'Editar canción'}</h2>
              <button className={styles.closeBtn} onClick={() => setEditing(null)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.fullCol}>
                <label className={styles.label}>Título</label>
                <input
                  className={styles.input}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nombre de la canción"
                />
              </div>

              <div>
                <label className={styles.label}>Tonalidad</label>
                <select
                  className={styles.input}
                  value={form.key || ''}
                  onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
                >
                  <option value="">Sin tono</option>
                  {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              <div>
                <label className={styles.label}>Velocidad</label>
                <select
                  className={styles.input}
                  value={form.speed || ''}
                  onChange={e => setForm(f => ({ ...f, speed: e.target.value }))}
                >
                  <option value="">Sin clasificar</option>
                  {SPEEDS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className={styles.label}>BPM</label>
                <input
                  type="number" min="1" max="300"
                  className={styles.input}
                  value={form.bpm || ''}
                  onChange={e => setForm(f => ({ ...f, bpm: e.target.value }))}
                  placeholder="Ej: 82"
                />
              </div>

              <div>
                <label className={styles.label}>Banda</label>
                <input
                  className={styles.input}
                  list="bands-list"
                  value={form.band || ''}
                  onChange={e => setForm(f => ({ ...f, band: e.target.value }))}
                  placeholder="Ej: Elevation Worship"
                />
                <datalist id="bands-list">
                  {bands.map(b => <option key={b} value={b} />)}
                </datalist>
              </div>

              <div>
                <label className={styles.label}>
                  <input
                    type="checkbox"
                    checked={form.is_mvi || false}
                    onChange={e => setForm(f => ({ ...f, is_mvi: e.target.checked }))}
                  /> Es MVI
                </label>
              </div>

              <div className={styles.fullCol}>
                <label className={styles.label}>Contenido (acordes y letra)</label>
                <textarea
                  className={styles.textarea}
                  value={form.content || ''}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="VERSO&#10;   G    D&#10;Letra de la canción..."
                  rows={18}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                <Check size={16} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
