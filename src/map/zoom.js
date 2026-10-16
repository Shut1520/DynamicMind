import { BREADCRUMB_SPACE, MOBILE_BREAKPOINT, PANEL_MARGIN, PANEL_WIDTH } from '../layout.js'

/** Transformation SVG : translate(x, y) scale(k). */
export const IDENTITY = Object.freeze({ k: 1, x: 0, y: 0 })

const DEFAULT_PADDING = 24
const DEFAULT_MAX_SCALE = 40

/**
 * Transformation qui centre `bounds` ([[x0, y0], [x1, y1]], en px de carte)
 * dans `area` ({ x, y, width, height }, en px d'écran).
 */
export function fitTransform(bounds, area, { padding = DEFAULT_PADDING, maxScale = DEFAULT_MAX_SCALE } = {}) {
  const [[x0, y0], [x1, y1]] = bounds
  const scaleX = (area.width - 2 * padding) / Math.max(x1 - x0, Number.EPSILON)
  const scaleY = (area.height - 2 * padding) / Math.max(y1 - y0, Number.EPSILON)
  const k = Math.min(maxScale, scaleX, scaleY)

  return {
    k,
    x: area.x + area.width / 2 - k * ((x0 + x1) / 2),
    y: area.y + area.height / 2 - k * ((y0 + y1) / 2),
  }
}

/**
 * Zone de la carte laissée libre quand un pays est ouvert : sous le fil d'Ariane,
 * et à gauche du panneau d'infos sur grand écran (sur mobile, il est sous la carte).
 */
export function freeArea({ width, height }, isPanelOpen) {
  if (!isPanelOpen) return { x: 0, y: 0, width, height }
  const isSidePanel = width > MOBILE_BREAKPOINT
  const hiddenRight = isSidePanel ? Math.min(PANEL_WIDTH, width - 2 * PANEL_MARGIN) + PANEL_MARGIN : 0
  return { x: 0, y: BREADCRUMB_SPACE, width: width - hiddenRight, height: height - BREADCRUMB_SPACE }
}

// Une « vue » [cx, cy, w] (centre et largeur visibles) est le format attendu par d3.interpolateZoom.
export function viewFromTransform({ k, x, y }, { width, height }) {
  return [(width / 2 - x) / k, (height / 2 - y) / k, width / k]
}

export function transformFromView([cx, cy, w], { width, height }) {
  const k = width / w
  return { k, x: width / 2 - cx * k, y: height / 2 - cy * k }
}
