import { BrowserTelegramClient } from './browserClient'
import { detectTelegramWebApp } from './detect'
import type { TelegramClient } from './types'
import { WebAppTelegramClient } from './webAppClient'

export async function createTelegramClient(): Promise<TelegramClient> {
  const detected = detectTelegramWebApp()
  if (detected !== null) {
    return new WebAppTelegramClient(detected)
  }

  if (import.meta.env.DEV && import.meta.env.VITE_TELEGRAM_MOCK === 'true') {
    const { createMockWebApp } = await import('./mock')
    return new WebAppTelegramClient(createMockWebApp())
  }

  return new BrowserTelegramClient()
}
