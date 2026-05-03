import { getSong } from './api'

const cache = new Map()
const SESSION_KEY = 'song_cache_'

export function getCachedSong(id) {
  if (cache.has(id)) return cache.get(id)
  try {
    const stored = sessionStorage.getItem(SESSION_KEY + id)
    if (stored) {
      const data = JSON.parse(stored)
      cache.set(id, data)
      return data
    }
  } catch {}
  return null
}

export function prefetchSong(id) {
  if (cache.has(id)) return
  getSong(id)
    .then(data => {
      if (data) {
        cache.set(id, data)
        try { sessionStorage.setItem(SESSION_KEY + id, JSON.stringify(data)) } catch {}
      }
    })
    .catch(err => console.warn(`[songCache] Failed to prefetch song ${id}:`, err))
}

export function updateCachedSong(id, partial) {
  const current = getCachedSong(id) || {}
  const updated = { ...current, ...partial }
  cache.set(id, updated)
  try { sessionStorage.setItem(SESSION_KEY + id, JSON.stringify(updated)) } catch {}
}
