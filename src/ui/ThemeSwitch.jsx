import { useTheme } from './useTheme.js'

const OPTIONS = Object.freeze([
  { value: 'system', label: 'Auto', title: 'Suivre le thème du système' },
  { value: 'light', label: 'Clair', title: 'Thème clair' },
  { value: 'dark', label: 'Sombre', title: 'Thème sombre' },
])

/** Choix du thème : automatique (système), clair ou sombre. */
function ThemeSwitch() {
  const [theme, setTheme] = useTheme()

  return (
    <div className="theme-switch" role="group" aria-label="Thème">
      {OPTIONS.map(({ value, label, title }) => (
        <button
          key={value}
          type="button"
          className="theme-switch__option"
          aria-pressed={theme === value}
          title={title}
          onClick={() => setTheme(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default ThemeSwitch
