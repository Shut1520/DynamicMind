import AfricaMap from './map/AfricaMap.jsx'

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>Carte de l&apos;Afrique</h1>
        <p>Survole un pays pour découvrir ses informations.</p>
      </header>
      <main className="map-stage" aria-label="Carte interactive">
        <AfricaMap />
      </main>
    </div>
  )
}

export default App
