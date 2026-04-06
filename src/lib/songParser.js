// Detects if a line contains chords (not lyrics)
const CHORD_PATTERN = /^[\s]*([A-G][#b]?(m|maj|min|dim|aug|sus|add|\d)*(\/?[A-G][#b]?)?\s*)+$/

export function isChordLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return false
  // Must have at least one chord-like token
  if (!trimmed.match(/[A-G][#b]?/)) return false
  // Should not have too many lowercase words (lyrics)
  const words = trimmed.split(/\s+/)
  const chordWords = words.filter(w => /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|\d|\/[A-G][#b]?)*$/.test(w))
  return chordWords.length > 0 && chordWords.length >= words.length * 0.5
}

export function parseSongContent(rawText) {
  const lines = rawText.split('\n')
  const sections = []
  let currentSection = null
  let i = 0

  const SECTION_HEADERS = /^(INTRO|VERSO|PRE|CORO|PUENTE|OUTRO|BRIDGE|CHORUS|VERSE|ESTROFA|FINAL|FIN)/i

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (SECTION_HEADERS.test(trimmed)) {
      if (currentSection) sections.push(currentSection)
      currentSection = { name: trimmed, lines: [] }
    } else if (currentSection) {
      currentSection.lines.push({
        text: line,
        isChord: isChordLine(line),
        isEmpty: trimmed === ''
      })
    } else {
      // Before first section — could be metadata (BPM, key info)
      if (!currentSection && trimmed) {
        if (!sections.find(s => s.name === '_meta')) {
          sections.push({ name: '_meta', lines: [] })
        }
        sections.find(s => s.name === '_meta').lines.push({ text: line, isChord: false, isEmpty: false })
      }
    }
    i++
  }

  if (currentSection) sections.push(currentSection)
  return sections
}

export function extractMetaFromFilename(filename) {
  // Remove .docx extension
  const name = filename.replace(/\.docx$/i, '').replace(/\.pdf$/i, '')

  let key = null
  let speed = null
  let title = name

  // Check speed prefix (lowercase a, b, c at start)
  const speedMatch = name.match(/^([abc])\s+/)
  if (speedMatch) {
    const s = speedMatch[1]
    speed = s === 'a' ? 'rapida' : s === 'b' ? 'intermedia' : 'lenta'
    title = name.replace(/^[abc]\s+/, '')
  }

  // Check key prefix (e.g. "A - ", "Bb - ", "F# - ", "D - ")
  const keyMatch = title.match(/^([A-G][#b]?)\s*[-–]\s*/)
  if (keyMatch) {
    key = keyMatch[1]
    title = title.replace(/^([A-G][#b]?)\s*[-–]\s*/, '')
  }

  // Also check number prefix like "1 ", "20 ", "4 "
  title = title.replace(/^\d+\s+/, '')

  // Clean up extra markers
  title = title
    .replace(/eliuth/gi, '')
    .replace(/\s*[✓✞$]\s*\d*/g, '')
    .replace(/_+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Detect MVI prefix
  const isMVI = /^MVI\s/i.test(title)
  if (isMVI) title = title.replace(/^MVI\s+/i, '').trim()

  // Detect Nashville prefix
  const isNashville = /^Nashville\s/i.test(title)
  if (isNashville) title = title.replace(/^Nashville\s+/i, '').trim()

  return { title, key, speed, isMVI, isNashville }
}
