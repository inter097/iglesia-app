/**
 * api.js — capa unificada de acceso a datos
 * Usa Supabase o VPS según VITE_USE_SUPABASE
 * Para volver a Supabase: VITE_USE_SUPABASE=true en .env
 */
import { supabase } from './supabase'

const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true'
const API_URL = import.meta.env.VITE_API_URL || 'https://api.eliuth.dev'
const BASE = `${API_URL}/iglesia`

// ── Auth helpers (VPS) ────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('iglesia_token')
}

function setToken(token) {
  localStorage.setItem('iglesia_token', token)
}

function clearToken() {
  localStorage.removeItem('iglesia_token')
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  }
}

async function vpsRequest(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error en la API')
  return data
}

// ── Auth ──────────────────────────────────────────────────────────────────
export async function login(password) {
  if (USE_SUPABASE) {
    // Supabase necesita email — usamos el almacenado en env o valor fijo
    const email = import.meta.env.VITE_ADMIN_EMAIL || 'admin@iglesia.dev'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Password incorrecto')
    return true
  }
  const data = await vpsRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  })
  setToken(data.token)
  return true
}

export async function logout() {
  if (USE_SUPABASE) {
    await supabase.auth.signOut()
  } else {
    clearToken()
  }
}

export async function isAuthenticated() {
  if (USE_SUPABASE) {
    const { data } = await supabase.auth.getSession()
    return !!data.session
  }
  const token = getToken()
  if (!token) return false
  try {
    await vpsRequest('/auth/verify', { headers: authHeaders() })
    return true
  } catch {
    clearToken()
    return false
  }
}

// ── Songs ─────────────────────────────────────────────────────────────────
export async function getSongs(fields = '*') {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('songs').select(fields).order('title')
    if (error) throw error
    return data
  }
  return vpsRequest('/songs')
}

export async function getSong(id) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('songs').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }
  return vpsRequest(`/songs/${id}`)
}

export async function createSong(songData) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('songs').insert([songData]).select().single()
    if (error) throw error
    return data
  }
  return vpsRequest('/songs', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(songData)
  })
}

export async function updateSong(id, songData) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('songs').update(songData).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  return vpsRequest(`/songs/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(songData)
  })
}

export async function deleteSong(id) {
  if (USE_SUPABASE) {
    const { error } = await supabase.from('songs').delete().eq('id', id)
    if (error) throw error
    return true
  }
  return vpsRequest(`/songs/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
}

// ── Setlists ──────────────────────────────────────────────────────────────
export async function getSetlists() {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('setlists').select('*').order('day')
    if (error) throw error
    return data
  }
  return vpsRequest('/setlists')
}

export async function getSetlistSongs(setlistId) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('setlist_songs')
      .select('id, position, transpose, song:song_id(id, title, key, speed, has_error)')
      .eq('setlist_id', setlistId)
      .order('position')
    if (error) throw error
    return data
  }
  const flat = await vpsRequest(`/setlists/${setlistId}`)
  // Normalizar al formato que esperan los componentes
  return flat.map(r => ({
    id: r.id,
    position: r.position,
    transpose: r.transpose || 0,
    song: {
      id: r.song_id,
      title: r.title,
      key: r.key,
      speed: r.speed,
      has_error: r.has_error || false
    }
  }))
}

export async function createSetlist(day) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('setlists').insert({ day }).select().single()
    if (error) throw error
    return data
  }
  return vpsRequest('/setlists', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ day })
  })
}

export async function addSongToSetlist(setlistId, songId, position, transpose = 0) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('setlist_songs')
      .insert({ setlist_id: setlistId, song_id: songId, position, transpose })
      .select().single()
    if (error) throw error
    return data
  }
  return vpsRequest(`/setlists/${setlistId}/songs`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ song_id: songId, position, transpose })
  })
}

export async function removeSongFromSetlist(setlistId, songItemId) {
  if (USE_SUPABASE) {
    const { error } = await supabase.from('setlist_songs').delete().eq('id', songItemId)
    if (error) throw error
    return true
  }
  return vpsRequest(`/setlists/${setlistId}/songs/${songItemId}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
}

export async function getAllSetlistSongs() {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('setlist_songs')
      .select('song_id, setlist:setlist_id(day)')
    if (error) throw error
    return data
  }
  return vpsRequest('/setlist-songs/all')
}

export async function updateSetlistSong(setlistId, songItemId, data) {
  if (USE_SUPABASE) {
    const { data: d, error } = await supabase
      .from('setlist_songs').update(data).eq('id', songItemId).select().single()
    if (error) throw error
    return d
  }
  return vpsRequest(`/setlists/${setlistId}/songs/${songItemId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data)
  })
}
