import { useEffect, useState, type PropsWithChildren } from 'react'
import { BootScreen } from '../../app/layout/BootScreen'
import { createTelegramClient } from './createClient'
import { TelegramContext } from './telegram-context'
import type { TelegramClient } from './types'

export function TelegramProvider({ children }: PropsWithChildren) {
  const [client, setClient] = useState<TelegramClient | null>(null)

  useEffect(() => {
    let active = true
    let instance: TelegramClient | undefined
    void createTelegramClient().then((next) => {
      instance = next
      if (!active) {
        next.destroy()
        return
      }
      next.ready()
      next.expand()
      next.applyViewport()
      setClient(next)
    })
    return () => {
      active = false
      instance?.destroy()
    }
  }, [])

  if (client === null) {
    return <BootScreen />
  }

  return (
    <TelegramContext.Provider value={client}>
      {children}
    </TelegramContext.Provider>
  )
}
