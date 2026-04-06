const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

function noteIndex(note) {
  let idx = NOTES.indexOf(note)
  if (idx === -1) idx = NOTES_FLAT.indexOf(note)
  return idx
}

export function transposeNote(note, semitones) {
  const idx = noteIndex(note)
  if (idx === -1) return note
  const newIdx = ((idx + semitones) % 12 + 12) % 12
  // prefer flats for certain keys
  return NOTES_FLAT[newIdx]
}

export function transposeChord(chord, semitones) {
  if (semitones === 0) return chord
  // Match chord root + optional sharp/flat + optional bass note
  return chord.replace(/([A-G][#b]?)(?:\/([A-G][#b]?))?/g, (match, root, bass) => {
    const newRoot = transposeNote(root, semitones)
    if (bass) {
      const newBass = transposeNote(bass, semitones)
      return match.replace(root, newRoot).replace(bass, newBass)
    }
    return match.replace(root, newRoot)
  })
}

// Transpose a full line of chords
export function transposeLine(line, semitones) {
  if (semitones === 0) return line
  // Split by spaces/tabs preserving spacing, transpose each chord token
  return line.replace(/[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?(?:\d+)?(?:\/[A-G][#b]?)?/g, (chord) => {
    return transposeChord(chord, semitones)
  })
}
