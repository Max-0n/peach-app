import { useEffect } from 'react'
import { useData } from '../data/data-context'
import { applyTheme } from './applyTheme'

export function ThemeSync() {
  const theme = useData().settings?.theme ?? 'system'

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return null
}
