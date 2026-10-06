import { useEffect, useMemo, type PropsWithChildren } from 'react'
import { dictionary } from './dictionary'
import { LocaleContext, type LocaleContextValue } from './locale-context'
import { useLocaleStore } from './locale-store'

export function LocaleProvider({ children }: PropsWithChildren) {
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => {
        const template = dictionary[locale][key]
        if (vars === undefined) {
          return template
        }
        return Object.entries(vars).reduce(
          (text, [name, replacement]) =>
            text.replaceAll(`{${name}}`, replacement),
          template,
        )
      },
    }),
    [locale, setLocale],
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}
