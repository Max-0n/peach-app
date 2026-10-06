import { createContext, useContext } from 'react'
import type { TelegramClient } from './types'

export const TelegramContext = createContext<TelegramClient | null>(null)

export function useTelegram(): TelegramClient {
  const client = useContext(TelegramContext)
  if (client === null) {
    throw new Error('useTelegram must be used within TelegramProvider')
  }
  return client
}
