/**
 * offlineQueue.js — cola de cambios pendientes cuando no hay internet
 * Guarda en IndexedDB, sincroniza cuando vuelve la conexión
 */

const DB_NAME = 'iglesia-offline'
const STORE = 'queue'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = e => reject(e.target.error)
  })
}

export async function enqueue(operation) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).add({ ...operation, createdAt: Date.now() })
    tx.oncomplete = resolve
    tx.onerror = e => reject(e.target.error)
  })
}

export async function getQueue() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = e => reject(e.target.error)
  })
}

export async function removeFromQueue(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = resolve
    tx.onerror = e => reject(e.target.error)
  })
}

export async function getPendingCount() {
  const queue = await getQueue()
  return queue.length
}

export async function syncQueue(apiFn) {
  const queue = await getQueue()
  if (queue.length === 0) return 0

  let synced = 0
  for (const item of queue) {
    try {
      await apiFn(item)
      await removeFromQueue(item.id)
      synced++
    } catch (err) {
      console.warn('[offlineQueue] sync failed for item', item.id, err.message)
      break
    }
  }
  return synced
}
