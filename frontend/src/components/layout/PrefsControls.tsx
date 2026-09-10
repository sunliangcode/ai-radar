import { useTranslation } from 'react-i18next'
import { Monitor, Moon, Rows2, Rows3, Grip, Sun } from 'lucide-react'
import { usePrefs } from '../providers/PrefsProvider'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language.startsWith('zh') ? 'zh' : 'en'
  return (
    <div className="flex gap-0.5">
      {(['zh', 'en'] as const).map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => void i18n.changeLanguage(lng)}
          className={`rounded px-1.5 py-0.5 text-[11px] font-mono ${
            current === lng ? 'bg-ink text-surface' : 'text-muted hover:text-ink'
          }`}
        >
          {lng === 'zh' ? '中' : 'EN'}
        </button>
      ))}
    </div>
  )
}

export function ThemeDensityControls() {
  const { t } = useTranslation()
  const { theme, setTheme, density, setDensity } = usePrefs()
  const themeOrder: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark']
  const themeIcon =
    theme === 'system' ? <Monitor size={14} /> : theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />
  const cycleTheme = () => {
    const next = themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length]
    setTheme(next)
  }
  const densityIcons: Record<typeof density, React.ReactNode> = {
    compact: <Rows3 size={12} />,
    comfortable: <Rows2 size={12} />,
    cozy: <Grip size={12} />,
  }
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={cycleTheme}
        className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-border/60 hover:text-ink"
        title={`${t('app.theme')}: ${t(`app.themeMode.${theme}`)}`}
        aria-label={`${t('app.theme')}: ${t(`app.themeMode.${theme}`)}`}
      >
        <span aria-hidden>{themeIcon}</span>
      </button>
      <div className="flex rounded border border-border p-0.5" role="group" aria-label={t('app.densityLabel')}>
        {(['compact', 'comfortable', 'cozy'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDensity(d)}
            className={`flex h-6 min-w-6 items-center justify-center rounded px-1 ${
              density === d ? 'bg-ink text-surface' : 'text-muted hover:text-ink'
            }`}
            title={t(`app.density.${d}`)}
            aria-label={t(`app.density.${d}`)}
            aria-pressed={density === d}
          >
            <span aria-hidden>{densityIcons[d]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
