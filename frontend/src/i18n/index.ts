import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import zh from './locales/zh.json'

export const LANG_STORAGE_KEY = 'ai-radar-lang'

function detectLanguage(): 'zh' | 'en' {
  const stored = localStorage.getItem(LANG_STORAGE_KEY)
  if (stored === 'zh' || stored === 'en') return stored
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

function syncDocumentLang(lng: string) {
  document.documentElement.lang = lng === 'zh' ? 'zh-CN' : 'en'
}

const initialLng = detectLanguage()
syncDocumentLang(initialLng)

void i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: initialLng,
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANG_STORAGE_KEY, lng === 'en' ? 'en' : 'zh')
  syncDocumentLang(lng)
})

export function dateLocale(lng?: string): string {
  const lang = lng ?? i18n.language
  return lang.startsWith('zh') ? 'zh-CN' : 'en-US'
}

export default i18n
