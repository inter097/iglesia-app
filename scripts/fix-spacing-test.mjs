/**
 * Test de limpieza de espacios en UNA canción
 * Uso:  node scripts/fix-spacing-test.mjs <email> <password> <titulo>
 * Apply: node scripts/fix-spacing-test.mjs <email> <password> <titulo> --apply
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const lines = readFileSync(join(__dirname, '..', '.env'), 'utf-8').split('\n')
  const env = {}
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) env[key.trim()] = rest.join('=').trim()
  }
  return env
}

function isChordLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (!trimmed.match(/[A-G]/)) return false
  const tokens = trimmed.split(/\s+/)
  const chordCount = tokens.filter(t => /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|\d+)*(\/[A-G][#b]?)?$/.test(t)).length
  return chordCount > 0 && chordCount >= tokens.length * 0.4
}

function fixContent(content) {
  const lines = content.split('\n')
  const result = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Si la línea actual es vacía, la línea anterior es acorde, y la siguiente es letra → saltarla
    if (line.trim() === '' && i > 0 && i < lines.length - 1) {
      const prev = lines[i - 1]
      const next = lines[i + 1]
      if (isChordLine(prev) && next.trim() && !isChordLine(next)) {
        continue // saltar esta línea vacía
      }
    }
    result.push(line)
  }

  return result.join('\n')
}

async function main() {
  const [email, password, ...rest] = process.argv.slice(2)
  const title = rest.filter(a => a !== '--apply').join(' ')
  if (!email || !password || !title) {
    console.error('Uso: node scripts/fix-spacing-test.mjs email password "titulo"')
    process.exit(1)
  }

  const env = loadEnv()
  const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY'])
  await supabase.auth.signInWithPassword({ email, password })

  const { data: songs } = await supabase
    .from('songs')
    .select('id, title, content')
    .ilike('title', `%${title}%`)
    .limit(5)

  if (!songs?.length) {
    console.error('No se encontró ninguna canción con ese título')
    process.exit(1)
  }

  const song = songs[0]
  console.log(`Canción: "${song.title}" (${song.id})\n`)

  const original = song.content || ''
  const fixed = fixContent(original)

  // Mostrar diff simple
  const origLines = original.split('\n')
  const fixedLines = fixed.split('\n')
  console.log(`Líneas originales: ${origLines.length}`)
  console.log(`Líneas después del fix: ${fixedLines.length}`)
  console.log(`Líneas eliminadas: ${origLines.length - fixedLines.length}\n`)

  console.log('--- PREVIEW (primeras 40 líneas después del fix) ---')
  console.log(fixedLines.slice(0, 40).join('\n'))
  console.log('\n---')
  console.log('\n¿Se ve bien? Para aplicar el cambio corre:')
  console.log(`node scripts/fix-spacing-test.mjs ${email} ${password} "${title}" --apply`)
}

async function apply() {
  const [email, password, ...rest] = process.argv.slice(2)
  const title = rest.filter(a => a !== '--apply').join(' ')

  const env = loadEnv()
  const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY'])
  await supabase.auth.signInWithPassword({ email, password })

  const { data: songs } = await supabase.from('songs').select('id, title, content').ilike('title', `%${title}%`).limit(1)
  const song = songs[0]
  const fixed = fixContent(song.content || '')

  const { error } = await supabase.from('songs').update({ content: fixed }).eq('id', song.id)
  if (error) console.error('Error:', error.message)
  else console.log(`✓ Canción "${song.title}" actualizada correctamente.`)
}

if (process.argv.includes('--apply')) {
  apply()
} else {
  main()
}
