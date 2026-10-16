import { useRef, useState } from 'react'

const ACTIVATION_KEYS = new Set(['Enter', ' '])

function targetOf(event) {
  const element = event.target.closest?.('[data-id]')
  return element
    ? { id: element.dataset.id, interactive: element.dataset.interactive !== 'false' }
    : null
}

function pointerPosition(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

/**
 * Survol de la carte : souris (survol), clavier (focus) et tactile
 * (1er tap = infobulle, 2e tap = activation, comme le « holdAction » d'Interactive Geo Maps).
 *
 * @param {{ onActivate?: (id: string) => void, getAnchor: (id: string) => [number, number] | undefined }} options
 * @returns {{ active: { id: string, x: number, y: number } | null, handlers: object }}
 */
export function useMapHover({ onActivate, getAnchor }) {
  const [active, setActive] = useState(null)
  const pointerType = useRef('mouse')

  const show = (id, position) => setActive({ id, ...position })
  const clear = () => setActive(null)

  const activate = (target) => {
    if (target?.interactive) onActivate?.(target.id)
  }

  const handlers = {
    onPointerDown(event) {
      pointerType.current = event.pointerType || 'mouse'
    },
    onPointerOver(event) {
      if (event.pointerType === 'touch') return
      const target = targetOf(event)
      if (target) show(target.id, pointerPosition(event))
      else clear()
    },
    onPointerMove(event) {
      if (event.pointerType === 'touch') return
      const { x, y } = pointerPosition(event)
      setActive((current) => (current ? { ...current, x, y } : current))
    },
    onPointerLeave(event) {
      if (event.pointerType !== 'touch') clear()
    },
    onClick(event) {
      const target = targetOf(event)
      if (pointerType.current !== 'touch') {
        activate(target)
        return
      }
      if (!target) clear()
      else if (active?.id === target.id) activate(target)
      else show(target.id, pointerPosition(event))
    },
    onFocus(event) {
      const id = event.target.dataset?.id
      const anchor = id && getAnchor(id)
      if (anchor) show(id, { x: anchor[0], y: anchor[1] })
    },
    onBlur() {
      clear()
    },
    onKeyDown(event) {
      if (event.key === 'Escape') {
        clear()
      } else if (ACTIVATION_KEYS.has(event.key)) {
        const target = targetOf(event)
        if (target) {
          event.preventDefault()
          activate(target)
        }
      }
    },
  }

  return { active, handlers }
}
