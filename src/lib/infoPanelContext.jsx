import { createContext, useState } from 'react'

export const InfoPanelContext = createContext()

export function InfoPanelProvider({ children }) {
  const [showPanel, setShowPanel] = useState(false)

  return (
    <InfoPanelContext.Provider value={{ showPanel, setShowPanel }}>
      {children}
    </InfoPanelContext.Provider>
  )
}
