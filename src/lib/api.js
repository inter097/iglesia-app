import { useState, useEffect } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'https://hub.eliuth.dev/iglesia'

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    isAuthenticated().then(setIsAdmin)
  }, [])
  return isAdmin
}

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

export async function login(password) {
  const data = await vpsRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  })
  setToken(data.token)
  return true
}

export async function logout() {
  clearToken()
}

export async function isAuthenticated() {
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

export async function getSongs() {
  return vpsRequest('/songs')
}

export async function getSong(id) {
  return vpsRequest(`/songs/${id}`)
}

export async function createSong(songData) {
  return vpsRequest('/songs', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(songData)
  })
}

export async function updateSong(id, songData) {
  return vpsRequest(`/songs/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(songData)
  })
}

export async function deleteSong(id) {
  return vpsRequest(`/songs/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
}

export async function getSetlists() {
  return vpsRequest('/setlists')
}

export async function getSetlistSongs(setlistId) {
  const flat = await vpsRequest(`/setlists/${setlistId}`)
  return flat.map(r => ({
    id: r.id,
    position: r.position,
    transpose: r.transpose || 0,
    is_post_message: r.is_post_message || false,
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
  return vpsRequest('/setlists', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ day })
  })
}

export async function addSongToSetlist(setlistId, songId, position, transpose = 0, isPostMessage = false) {
  return vpsRequest(`/setlists/${setlistId}/songs`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ song_id: songId, position, transpose, is_post_message: isPostMessage })
  })
}

export async function removeSongFromSetlist(setlistId, songItemId) {
  return vpsRequest(`/setlists/${setlistId}/songs/${songItemId}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
}

export async function getAllSetlistSongs() {
  return vpsRequest('/setlist-songs/all')
}

export async function updateSetlistSong(setlistId, songItemId, data) {
  return vpsRequest(`/setlists/${setlistId}/songs/${songItemId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data)
  })
}
