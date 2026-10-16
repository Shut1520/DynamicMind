import countriesInfo from '../data/countries-info.json'

const ROOT_LABEL = 'Afrique'

const labelOf = (entry) => countriesInfo[entry.id]?.name ?? entry.id

/**
 * Fil d'Ariane : Afrique › Pays › Région, chaque niveau parent est cliquable.
 * @param {{ path: {level: string, id: string}[], onNavigate: (depth: number) => void, onBack: () => void }} props
 */
function Breadcrumb({ path, onNavigate, onBack }) {
  const items = [
    { key: 'root', label: ROOT_LABEL },
    ...path.map((entry) => ({ key: `${entry.level}-${entry.id}`, label: labelOf(entry) })),
  ]
  const currentDepth = items.length - 1

  return (
    <nav className="breadcrumb" aria-label="Fil d'Ariane">
      {currentDepth > 0 && (
        <button type="button" className="breadcrumb__back" onClick={onBack} aria-label="Revenir au niveau précédent">
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <path d="M9 2L4 7l5 5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <ol className="breadcrumb__list">
        {items.map((item, depth) => (
          <li key={item.key} className="breadcrumb__item">
            {depth === currentDepth ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <button type="button" className="breadcrumb__link" onClick={() => onNavigate(depth)}>
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumb
