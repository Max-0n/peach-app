import { describe, expect, it } from 'vitest'
import { createTelegramClient } from './createClient'

describe('createTelegramClient', () => {
  it('returns a browser no-op client when Telegram is absent', async () => {
    const client = await createTelegramClient()
    expect(client.isTelegram).toBe(false)
    expect(client.cloud).toBeNull()
    expect(client.device).toBeNull()
    expect(client.user).toBeNull()
    client.ready()
    client.expand()
    client.applyViewport()
    client.backButton.show(() => undefined)
    client.mainButton.show('Save', () => undefined)
    client.haptic('success')
    await expect(client.checkHomeScreenStatus()).resolves.toBe('unsupported')
    client.destroy()
  })
})
