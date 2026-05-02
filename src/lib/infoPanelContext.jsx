import { createContext, useState } from 'react'
import { isAuthenticated } from './api'

export const InfoPanelContext = createContext()

export function InfoPanelProvider({ children }) {
  const [showPanel, setShowPanel] = useState(false)
  const [songTitle, setSongTitle] = useState('')
  const [songBand, setSongBand] = useState('')
  const [devMode, setDevMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('devMode') || 'false') }
    catch { return false }
  })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saveMeta, setSaveMeta] = useState(() => () => {})

  const toggleDevMode = async (value) => {
    const auth = await isAuthenticated()
    if (!auth) return
    setDevMode(value)
    localStorage.setItem('devMode', JSON.stringify(value))
  }

  return (
    <InfoPanelContext.Provider value={{ showPanel, setShowPanel, songTitle, setSongTitle, songBand, setSongBand, devMode, toggleDevMode, hasUnsavedChanges, setHasUnsavedChanges, editMode, setEditMode, saveMeta, setSaveMeta }}>
      {children}
    </InfoPanelContext.Provider>
  )
}
