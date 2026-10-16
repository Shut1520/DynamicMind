import { useRef, useState } from 'react'

const ACTIVATION_KEYS = new Set(['Enter', ' '])

function targetOf(event) {
  const element = event.target.closest?.('[data-id]')
  return element
    ? {
        id: element.dataset.id,
        level: element.dataset.level ?? 'country',
        interactive: element.dataset.interactive !== 'false',
      }
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
 * @param {{ onActivate?: (id: string, level: string) => void, getAnchor: (id: string) => [number, number] | undefined }} options
 * @returns {{ active: { id: string, x: number, y: number } | null, handlers: object }}
 */
export function useMapHover({ onActivate, getAnchor }) {
  const [active, setActive] = useState(null)
  const pointerType = useRef('mouse')
  // Pays actif au moment de l'appui : le focus donné par le navigateur au tap ne doit pas compter.
  const activeAtPress = useRef(null)
  const isPointerPressed = useRef(false)

  const show = (id, position) => setActive({ id, ...position })
  const clear = () => setActive(null)

  const activate = (target) => {
    if (target?.interactive) onActivate?.(target.id, target.level)
  }

  const handlers = {
    onPointerDown(event) {
      pointerType.current = event.pointerType || 'mouse'
      activeAtPress.current = active?.id ?? null
      isPointerPressed.current = true
    },
    onPointerUp() {
      isPointerPressed.current = false
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
      isPointerPressed.current = false
      if (event.pointerType !== 'touch') clear()
    },
    onClick(event) {
      const target = targetOf(event)
      if (pointerType.current !== 'touch') {
        activate(target)
        return
      }
      if (!target) clear()
      else if (activeAtPress.current === target.id) activate(target)
      else show(target.id, pointerPosition(event))
    },
    onFocus(event) {
      // Le focus donné par un clic ou un tap est déjà géré par le survol.
      if (isPointerPressed.current) return
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
