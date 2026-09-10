import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/* Theme & density (global, persisted to localStorage) */

export type Theme = 'light' | 'dark' | 'system'
export type Density = 'comfortable' | 'compact' | 'cozy'

const PrefsContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
  density: Density
  setDensity: (d: Density) => void
}>({
  theme: 'system',
  setTheme: () => {},
  density: 'comfortable',
  setDensity: () => {},
})

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('radar-theme') as Theme) || 'system',
  )
  const [density, setDensityState] = useState<Density>(
    () => (localStorage.getItem('radar-density') as Density) || 'comfortable',
  )

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const dark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      root.classList.toggle('dark', dark)
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density)
  }, [density])

  const setTheme = (t: Theme) => {
    localStorage.setItem('radar-theme', t)
    setThemeState(t)
  }
  const setDensity = (d: Density) => {
    localStorage.setItem('radar-density', d)
    setDensityState(d)
  }

  return (
    <PrefsContext.Provider value={{ theme, setTheme, density, setDensity }}>
      {children}
    </PrefsContext.Provider>
  )
}

export function usePrefs() {
  return useContext(PrefsContext)
}
