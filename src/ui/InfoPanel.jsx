import { useCallback, useEffect, useRef, useState } from 'react'
import { countrySheet, regionSheet } from './panelSheets.js'

// Filet de sécurité si l'animation de fermeture ne se déclenche pas (animations réduites).
const CLOSE_FALLBACK_MS = 300

/**
 * Fiche détaillée de l'entité ouverte la plus fine (commune, subdivision, région ou pays),
 * avec animations d'ouverture et de fermeture.
 * @param {{ countryId: string | null, region?: object | null, subregion?: object | null, locality?: object | null, onClose: () => void }} props
 */
function sheetFor(countryId, ...levels) {
  const finest = levels.findLast(Boolean)
  if (finest) return regionSheet(finest)
  return countryId ? countrySheet(countryId) : null
}

function InfoPanel({ countryId, region = null, subregion = null, locality = null, onClose }) {
  const sheet = sheetFor(countryId, region, subregion, locality)
  const [shown, setShown] = useState(sheet)
  const headingRef = useRef(null)
  const returnFocusRef = useRef(null)

  // Une nouvelle fiche remplace immédiatement l'ancienne ; plus de fiche lance la fermeture.
  if (sheet && sheet.key !== shown?.key) {
    setShown(sheet)
  }
  const isClosing = !sheet && shown !== null
  const sheetKey = sheet?.key ?? null

  const finishClosing = useCallback(() => {
    setShown(null)
    const previous = returnFocusRef.current
    returnFocusRef.current = null
    if (previous?.isConnected) previous.focus()
  }, [])

  useEffect(() => {
    if (!sheetKey) return undefined
    returnFocusRef.current ??= document.activeElement
    headingRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sheetKey, onClose])

  useEffect(() => {
    if (!isClosing) return undefined
    const timer = setTimeout(finishClosing, CLOSE_FALLBACK_MS)
    return () => clearTimeout(timer)
  }, [isClosing, finishClosing])

  if (!shown) return null

  return (
    <aside
      className={isClosing ? 'info-panel is-closing' : 'info-panel'}
      aria-label={shown.label}
      onAnimationEnd={(event) => {
        if (isClosing && event.target === event.currentTarget) finishClosing()
      }}
    >
      <header className="info-panel__header">
        {shown.flag && (
          <img className="info-panel__flag" src={shown.flag.src} alt={shown.flag.alt} width="72" height="48" />
        )}
        <div className="info-panel__titles">
          <h2 ref={headingRef} tabIndex={-1} className="info-panel__title">
            {shown.title}
          </h2>
          <p className="info-panel__official">{shown.subtitle}</p>
        </div>
        <button type="button" className="info-panel__close" onClick={onClose} aria-label="Fermer la fiche">
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <dl key={shown.key} className="info-panel__facts">
        {shown.facts.map(([label, value]) => (
          <div key={label} className="info-panel__fact">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <p className="info-panel__sources">{shown.sources}</p>
    </aside>
  )
}

export default InfoPanel
