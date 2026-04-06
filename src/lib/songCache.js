import { supabase } from './supabase'

const cache = new Map()  // songId → full song data

export function getCachedSong(id) {
  return cache.get(id) || null
}

export function prefetchSong(id) {
  if (cache.has(id)) return  // ya está cacheada
  supabase.from('songs').select('*').eq('id', id).single().then(({ data }) => {
    if (data) cache.set(id, data)
  })
}

export function updateCachedSong(id, partial) {
  if (cache.has(id)) cache.set(id, { ...cache.get(id), ...partial })
}
