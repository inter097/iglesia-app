import { getSong } from './api'

const cache = new Map()

export function getCachedSong(id) {
  return cache.get(id) || null
}

export function prefetchSong(id) {
  if (cache.has(id)) return
  getSong(id)
    .then(data => { if (data) cache.set(id, data) })
    .catch(err => console.warn(`[songCache] Failed to prefetch song ${id}:`, err))
}

export function updateCachedSong(id, partial) {
  if (cache.has(id)) cache.set(id, { ...cache.get(id), ...partial })
}
