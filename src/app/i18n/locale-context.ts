import { createContext, useContext } from 'react'
import type { Locale, TranslationKey } from './dictionary'

export interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, vars?: Record<string, string>) => string
}

export const LocaleContext = createContext<LocaleContextValue | null>(null)

export function useTranslation(): LocaleContextValue {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useTranslation must be used within LocaleProvider')
  }
  return context
}
