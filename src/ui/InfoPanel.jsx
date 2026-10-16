import { useCallback, useEffect, useRef, useState } from 'react'
import countriesInfo from '../data/countries-info.json'
import { assetUrl } from './assets.js'
import { formatArea, formatDensity, formatList, formatPopulation } from './format.js'

// Filet de sécurité si l'animation de fermeture ne se déclenche pas (animations réduites).
const CLOSE_FALLBACK_MS = 300

const plural = (items, singular, pluralLabel) => (items.length > 1 ? pluralLabel : singular)

function factsOf(info) {
  return [
    [plural(info.capitals, 'Capitale', 'Capitales'), formatList(info.capitals)],
    ['Population', `${formatPopulation(info.population)} (${info.populationYear})`],
    ['Superficie', formatArea(info.area)],
    ['Densité', formatDensity(info.population, info.area)],
    [plural(info.languages, 'Langue', 'Langues'), formatList(info.languages)],
    [
      plural(info.currencies, 'Monnaie', 'Monnaies'),
      formatList(info.currencies.map(({ code, name }) => `${name} · ${code}`)),
    ],
    ['Indicatif', info.callingCode],
    ['Région', info.subregion],
    ['Habitants', info.demonym],
  ].filter(([, value]) => value)
}

/** Fiche détaillée du pays sélectionné, avec animations d'ouverture et de fermeture. */
function InfoPanel({ countryId, onClose }) {
  const [shownId, setShownId] = useState(countryId)
  const headingRef = useRef(null)
  const returnFocusRef = useRef(null)

  // Un nouveau pays remplace immédiatement l'ancien ; une désélection lance la fermeture.
  if (countryId && countryId !== shownId) {
    setShownId(countryId)
  }
  const isClosing = !countryId && shownId !== null

  const finishClosing = useCallback(() => {
    setShownId(null)
    const previous = returnFocusRef.current
    returnFocusRef.current = null
    if (previous?.isConnected) previous.focus()
  }, [])

  useEffect(() => {
    if (!countryId) return undefined
    returnFocusRef.current ??= document.activeElement
    headingRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [countryId, onClose])

  useEffect(() => {
    if (!isClosing) return undefined
    const timer = setTimeout(finishClosing, CLOSE_FALLBACK_MS)
    return () => clearTimeout(timer)
  }, [isClosing, finishClosing])

  const info = shownId ? countriesInfo[shownId] : undefined
  if (!info) return null

  return (
    <aside
      className={isClosing ? 'info-panel is-closing' : 'info-panel'}
      aria-label={`Fiche du pays : ${info.name}`}
      onAnimationEnd={(event) => {
        if (isClosing && event.target === event.currentTarget) finishClosing()
      }}
    >
      <header className="info-panel__header">
        <img
          className="info-panel__flag"
          src={assetUrl(info.flag)}
          alt={`Drapeau : ${info.name}`}
          width="72"
          height="48"
        />
        <div className="info-panel__titles">
          <h2 ref={headingRef} tabIndex={-1} className="info-panel__title">
            {info.name}
          </h2>
          <p className="info-panel__official">{info.officialName}</p>
        </div>
        <button type="button" className="info-panel__close" onClick={onClose} aria-label="Fermer la fiche">
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <dl key={info.id} className="info-panel__facts">
        {factsOf(info).map(([label, value]) => (
          <div key={label} className="info-panel__fact">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <p className="info-panel__sources">
        Sources : Banque mondiale (population), mledoze/countries, Wikidata.
      </p>
    </aside>
  )
}

export default InfoPanel
