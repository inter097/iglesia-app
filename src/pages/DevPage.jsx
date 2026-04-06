import styles from './DevPage.module.css'

const DONE = [
  'Importación masiva de 323 canciones desde .docx',
  'Vista de canción con transpositor de acordes',
  'Panel admin CRUD canciones',
  'Repertorio por día (Miércoles, Sábado, Domingo)',
  'Persistencia del día seleccionado (localStorage)',
  'Tema oscuro/claro',
  'Página de canciones con filtros por tono y velocidad',
]

const TODO = [
  'Limpiar espacios extra entre acordes y letra en las canciones',
  'Modo presentación (pantalla completa, letra grande)',
  'Volver a proteger admin con login (cuando esté listo)',
  'Notas por canción en el repertorio (ej: "tocar en D")',
  'Ver historial de qué canciones se tocaron',
  'Buscador mejorado (buscar también por letra)',
  'Drag & drop en tablet/touch: agregar soporte táctil (touchstart/touchmove/touchend) o migrar a @dnd-kit',
  'Simplificar interfaz de canción: ocultar botones poco usados (font, transpose, editar, error) detrás de un menú ⋯',
]

const IDEAS = [
  'Compartir repertorio del día por link',
  'Marcar canciones como favoritas',
  'Modo ensayo: countdown timer por canción',
]

export default function DevPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dev — Estado del proyecto</h1>
      <p className={styles.sub}>Esta página solo existe en desarrollo. No la verá la congregación.</p>

      <Section title="✅ Hecho" items={DONE} color="green" />
      <Section title="🔧 Pendiente" items={TODO} color="orange" />
      <Section title="💡 Ideas futuras" items={IDEAS} color="purple" />
    </div>
  )
}

function Section({ title, items, color }) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ul className={styles.list}>
        {items.map((item, i) => (
          <li key={i} className={`${styles.item} ${styles[color]}`}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
