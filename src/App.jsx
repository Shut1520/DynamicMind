import { useCallback, useState } from 'react'
import AfricaMap from './map/AfricaMap.jsx'
import InfoPanel from './ui/InfoPanel.jsx'

function App() {
  const [selectedId, setSelectedId] = useState(null)
  const closePanel = useCallback(() => setSelectedId(null), [])

  return (
    <div className="app">
      <header className="app__header">
        <h1>Carte de l&apos;Afrique</h1>
        <p>Survole ou touche un pays pour découvrir ses informations.</p>
      </header>
      <main className="map-area" aria-label="Carte interactive">
        <div className="map-stage">
          <AfricaMap selectedId={selectedId} onCountryActivate={setSelectedId} />
        </div>
        <InfoPanel countryId={selectedId} onClose={closePanel} />
      </main>
    </div>
  )
}

export default App
