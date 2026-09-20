import { useTranslation } from 'react-i18next'
import { Monitor, Moon, Rows2, Rows3, Grip, Sun } from 'lucide-react'
import { usePrefs } from '../providers/PrefsProvider'
import { cn } from '../../lib/cn'

const focusBtn =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const current = i18n.language.startsWith('zh') ? 'zh' : 'en'
  return (
    <div className="flex gap-0.5" role="group" aria-label={t('app.language')}>
      {(['zh', 'en'] as const).map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => void i18n.changeLanguage(lng)}
          aria-pressed={current === lng}
          aria-label={lng === 'zh' ? t('nav.langZh') : t('nav.langEn')}
          className={cn(
            'min-h-9 min-w-9 rounded px-1.5 py-1 text-[11px] font-mono',
            focusBtn,
            current === lng ? 'bg-ink text-surface' : 'text-muted hover:text-ink',
          )}
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
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded text-muted transition motion-reduce:transition-none hover:bg-border/60 hover:text-ink',
          focusBtn,
        )}
        title={`${t('app.theme')}: ${t(`app.themeMode.${theme}`)}`}
        aria-label={`${t('app.theme')}: ${t(`app.themeMode.${theme}`)}`}
      >
        <span aria-hidden>{themeIcon}</span>
      </button>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {t(`app.themeMode.${theme}`)}
      </span>
      <div className="flex rounded border border-border p-0.5" role="group" aria-label={t('app.densityLabel')}>
        {(['compact', 'comfortable', 'cozy'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDensity(d)}
            className={cn(
              'flex h-9 min-w-9 items-center justify-center rounded px-1.5 transition motion-reduce:transition-none',
              focusBtn,
              density === d ? 'bg-ink text-surface' : 'text-muted hover:text-ink',
            )}
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
