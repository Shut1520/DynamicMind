import { interpolateZoom } from 'd3-interpolate'
import { useEffect, useRef, useState } from 'react'
import { transformFromView, viewFromTransform } from './zoom.js'

const MIN_DURATION_MS = 500
const MAX_DURATION_MS = 1000

const easeCubicInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

const isSame = (a, b) => a.k === b.k && a.x === b.x && a.y === b.y

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Anime la transformation de la carte vers `target` en suivant le chemin
 * « zoom arrière puis avant » de d3.interpolateZoom (van Wijk & Nuij).
 * Saute directement à la cible si le conteneur change de taille ou si
 * l'utilisateur a demandé moins d'animations.
 *
 * @param {{k: number, x: number, y: number}} target  objet stable (mémoïsé) tant que la cible ne change pas
 * @param {{width: number, height: number}} size
 */
export function useZoomTransition(target, { width, height }) {
  const [current, setCurrent] = useState(target)
  const currentRef = useRef(target)
  const sizeRef = useRef({ width, height })

  useEffect(() => {
    const update = (transform) => {
      currentRef.current = transform
      setCurrent(transform)
    }
    const size = { width, height }
    const sizeChanged = sizeRef.current.width !== width || sizeRef.current.height !== height
    sizeRef.current = size

    const from = currentRef.current
    if (isSame(from, target)) return undefined
    if (sizeChanged || !(width > 0 && height > 0) || prefersReducedMotion()) {
      update(target)
      return undefined
    }

    const interpolate = interpolateZoom(viewFromTransform(from, size), viewFromTransform(target, size))
    const duration = Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, interpolate.duration))
    const start = performance.now()
    let frame

    const tick = () => {
      const progress = Math.min(1, (performance.now() - start) / duration)
      update(progress === 1 ? target : transformFromView(interpolate(easeCubicInOut(progress)), size))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frame)
  }, [target, width, height])

  return current
}
