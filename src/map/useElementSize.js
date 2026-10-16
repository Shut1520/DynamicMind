import { useLayoutEffect, useRef, useState } from 'react'

/** Suit la taille d'un élément avec ResizeObserver. */
export function useElementSize() {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) {
      return undefined
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, size]
}
