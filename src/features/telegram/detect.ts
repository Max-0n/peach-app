import type { TelegramWebApp } from './types'

export function detectTelegramWebApp(): TelegramWebApp | null {
  try {
    const webApp = window.Telegram?.WebApp
    if (webApp === undefined) {
      return null
    }
    if (typeof webApp.initData === 'string' && webApp.initData.length > 0) {
      return webApp
    }
    return null
  } catch {
    return null
  }
}
