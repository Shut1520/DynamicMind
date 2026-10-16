import { useLayoutEffect, useRef } from 'react'

const OFFSET = 14

/**
 * Bulle positionnée près d'un point (x, y) du conteneur, retournée
 * vers la gauche ou le haut quand elle déborderait.
 */
function Tooltip({ id, x, y, bounds, children }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const element = ref.current
    const { offsetWidth: width, offsetHeight: height } = element
    const left = x + OFFSET + width > bounds.width ? x - OFFSET - width : x + OFFSET
    const top = y + OFFSET + height > bounds.height ? y - OFFSET - height : y + OFFSET
    element.style.transform = `translate(${Math.max(0, left)}px, ${Math.max(0, top)}px)`
  }, [x, y, bounds.width, bounds.height])

  return (
    <div ref={ref} id={id} role="tooltip" className="map-tooltip">
      {children}
    </div>
  )
}

export default Tooltip
