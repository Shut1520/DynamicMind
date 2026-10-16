import { useCallback } from 'react'
import AfricaMap from './map/AfricaMap.jsx'
import { useMapNavigation } from './state/useMapNavigation.js'
import Breadcrumb from './ui/Breadcrumb.jsx'
import InfoPanel from './ui/InfoPanel.jsx'

function App() {
  const { path, open, back, goTo } = useMapNavigation()
  const countryId = path.find((entry) => entry.level === 'country')?.id ?? null
  const regionEntry = path.find((entry) => entry.level === 'region') ?? null

  const openCountry = useCallback((id) => open('country', id), [open])
  const openRegion = useCallback((region) => open('region', region.id, region), [open])

  return (
    <div className="app">
      <header className="app__header">
        <h1>Carte de l&apos;Afrique</h1>
        <p>Survole ou touche un pays pour découvrir ses informations.</p>
      </header>
      <main className="map-area" aria-label="Carte interactive">
        <div className="map-stage">
          <Breadcrumb path={path} onNavigate={goTo} onBack={back} />
          <AfricaMap
            countryId={countryId}
            regionId={regionEntry?.id ?? null}
            onCountryActivate={openCountry}
            onRegionActivate={openRegion}
          />
        </div>
        <InfoPanel countryId={countryId} region={regionEntry?.data ?? null} onClose={back} />
      </main>
    </div>
  )
}

export default App
