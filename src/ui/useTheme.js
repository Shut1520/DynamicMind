import { useEffect, useState } from 'react'

// Même clé que le script d'index.html qui applique le thème avant le premier affichage.
export const THEME_STORAGE_KEY = 'dynamicmind-theme'
export const THEMES = Object.freeze(['system', 'light', 'dark'])

// Le stockage peut être indisponible (navigation privée, cookies bloqués) : le thème suit alors le système.
function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return THEMES.includes(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function storeTheme(theme) {
  try {
    if (theme === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY)
    else window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Préférence non mémorisée : elle reste valable jusqu'au rechargement de la page.
  }
}

/**
 * Thème choisi : 'system' (suit le système), 'light' ou 'dark'.
 * Le choix est posé sur <html data-theme> (lu par styles.css) et mémorisé dans le navigateur.
 */
export function useTheme() {
  const [theme, setTheme] = useState(readStoredTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
    storeTheme(theme)
  }, [theme])

  return [theme, setTheme]
}
