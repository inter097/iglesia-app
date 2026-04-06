/**
 * Script de importación masiva de canciones desde .docx a Supabase
 * Uso: node scripts/import-songs.mjs <email> <password>
 * Ejemplo: node scripts/import-songs.mjs admin@iglesia.com mipassword123
 */

import { createClient } from '@supabase/supabase-js'
import mammoth from 'mammoth'
import { readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Leer .env manualmente
function loadEnv() {
  const envPath = join(__dirname, '..', '.env')
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  const env = {}
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) env[key.trim()] = rest.join('=').trim()
  }
  return env
}

// Misma lógica que extractMetaFromFilename en songParser.js
function extractMeta(filename) {
  const name = filename.replace(/\.docx$/i, '')
  let key = null
  let speed = null
  let title = name

  const speedMatch = name.match(/^([abc])\s+/i)
  if (speedMatch) {
    const s = speedMatch[1].toLowerCase()
    speed = s === 'a' ? 'rapida' : s === 'b' ? 'intermedia' : 'lenta'
    title = name.replace(/^[abc]\s+/i, '')
  }

  const keyMatch = title.match(/^([A-G][#b]?)\s*[-–]\s*/)
  if (keyMatch) {
    key = keyMatch[1]
    title = title.replace(/^([A-G][#b]?)\s*[-–]\s*/, '')
  }

  title = title.replace(/^\d+\s+/, '')
  title = title
    .replace(/eliuth/gi, '')
    .replace(/\s*[✓✞$]\s*\d*/g, '')
    .replace(/_+/g, '')
    .replace(/[-–]\s*\d+$/g, '') // quitar sufijos tipo "-2", "-3"
    .replace(/\s+/g, ' ')
    .trim()

  const is_mvi = /^MVI\s/i.test(title)
  if (is_mvi) title = title.replace(/^MVI\s+/i, '').trim()

  const is_nashville = /^Nashville\s/i.test(title)
  if (is_nashville) title = title.replace(/^Nashville\s+/i, '').trim()

  return { title, key, speed, is_mvi, is_nashville }
}

async function main() {
  const [email, password] = process.argv.slice(2)
  if (!email || !password) {
    console.error('Uso: node scripts/import-songs.mjs <email> <password>')
    process.exit(1)
  }

  const env = loadEnv()
  const supabaseUrl = env['VITE_SUPABASE_URL']
  const supabaseKey = env['VITE_SUPABASE_ANON_KEY']

  if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Autenticar como admin
  console.log(`Autenticando como ${email}...`)
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) {
    console.error('Error de autenticación:', authError.message)
    process.exit(1)
  }
  console.log('Autenticado correctamente.\n')

  // Ruta a las canciones
  const songsDir = join(__dirname, '..', '..', 'Canciones AFC', 'Canciones AFC')
  const files = (await readdir(songsDir)).filter(f => f.endsWith('.docx'))
  console.log(`Encontradas ${files.length} canciones .docx\n`)

  let ok = 0
  let errores = 0

  for (const file of files) {
    const { title, key, speed, is_mvi, is_nashville } = extractMeta(file)

    if (!title) {
      console.warn(`  ⚠ Sin título: ${file}`)
      continue
    }

    // Leer contenido del .docx
    let content = ''
    try {
      const filePath = join(songsDir, file)
      const result = await mammoth.extractRawText({ path: filePath })
      content = result.value.trim()
    } catch (e) {
      console.warn(`  ⚠ No se pudo leer ${file}: ${e.message}`)
      errores++
      continue
    }

    // Insertar en Supabase
    const { error } = await supabase.from('songs').insert({
      title,
      key: key || null,
      speed: speed || null,
      content,
      is_mvi,
      is_nashville,
    })

    if (error) {
      console.error(`  ✗ Error insertando "${title}": ${error.message}`)
      errores++
    } else {
      console.log(`  ✓ ${title}${key ? ` [${key}]` : ''}${speed ? ` (${speed})` : ''}`)
      ok++
    }
  }

  console.log(`\nListo: ${ok} canciones importadas, ${errores} errores.`)
  process.exit(0)
}

main()
