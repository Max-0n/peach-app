import { useEffect } from 'react'
import { useTranslation } from '../../app/i18n/locale-context'
import { useData } from './data-context'

export function LocaleSync() {
  const locale = useData().settings?.locale
  const setLocale = useTranslation().setLocale

  useEffect(() => {
    if (locale !== undefined) {
      setLocale(locale)
    }
  }, [locale, setLocale])

  return null
}
