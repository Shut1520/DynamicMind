import { useCallback } from 'react'
import AfricaMap from './map/AfricaMap.jsx'
import { useMapNavigation } from './state/useMapNavigation.js'
import Breadcrumb from './ui/Breadcrumb.jsx'
import InfoPanel from './ui/InfoPanel.jsx'

function App() {
  const { path, open, back, goTo } = useMapNavigation()
  const countryId = path.find((entry) => entry.level === 'country')?.id ?? null
  const openCountry = useCallback((id) => open('country', id), [open])

  return (
    <div className="app">
      <header className="app__header">
        <h1>Carte de l&apos;Afrique</h1>
        <p>Survole ou touche un pays pour découvrir ses informations.</p>
      </header>
      <main className="map-area" aria-label="Carte interactive">
        <div className="map-stage">
          <Breadcrumb path={path} onNavigate={goTo} onBack={back} />
          <AfricaMap focusId={countryId} selectedId={countryId} onCountryActivate={openCountry} />
        </div>
        <InfoPanel countryId={countryId} onClose={back} />
      </main>
    </div>
  )
}

export default App
