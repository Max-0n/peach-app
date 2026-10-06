import {
  TelegramCloudStorage,
  TelegramDeviceStorage,
} from '../storage/adapters/TelegramStorage'
import type { RawAppStorage } from '../storage/adapters/AppStorage'
import type {
  HapticKind,
  HomeScreenStatus,
  TelegramClient,
  TelegramThemeParams,
  TelegramUser,
  TelegramWebApp,
} from './types'

function mapUser(webApp: TelegramWebApp): TelegramUser | null {
  const raw = webApp.initDataUnsafe.user
  if (raw === undefined) {
    return null
  }
  return {
    id: raw.id,
    firstName: raw.first_name,
    ...(raw.last_name === undefined ? {} : { lastName: raw.last_name }),
    ...(raw.username === undefined ? {} : { username: raw.username }),
    ...(raw.language_code === undefined
      ? {}
      : { languageCode: raw.language_code }),
  }
}

export class WebAppTelegramClient implements TelegramClient {
  readonly isTelegram = true
  private readonly webApp: TelegramWebApp
  readonly cloud: RawAppStorage | null
  readonly device: RawAppStorage | null
  private viewportHandler: (() => void) | null = null
  private backHandler: (() => void) | null = null
  private mainHandler: (() => void) | null = null

  constructor(webApp: TelegramWebApp) {
    this.webApp = webApp
    this.cloud =
      webApp.CloudStorage === undefined
        ? null
        : new TelegramCloudStorage(webApp.CloudStorage)
    this.device =
      webApp.DeviceStorage === undefined
        ? null
        : new TelegramDeviceStorage(webApp.DeviceStorage)
  }

  get user(): TelegramUser | null {
    return mapUser(this.webApp)
  }

  get themeParams(): TelegramThemeParams {
    return this.webApp.themeParams
  }

  get colorScheme(): 'light' | 'dark' {
    return this.webApp.colorScheme
  }

  ready(): void {
    this.webApp.ready()
  }

  expand(): void {
    this.webApp.expand()
  }

  applyViewport(): void {
    const root = document.documentElement
    const inset = this.webApp.safeAreaInset
    if (inset !== undefined) {
      root.style.setProperty(
        '--tg-safe-area-inset-top',
        `${String(inset.top)}px`,
      )
      root.style.setProperty(
        '--tg-safe-area-inset-right',
        `${String(inset.right)}px`,
      )
      root.style.setProperty(
        '--tg-safe-area-inset-bottom',
        `${String(inset.bottom)}px`,
      )
      root.style.setProperty(
        '--tg-safe-area-inset-left',
        `${String(inset.left)}px`,
      )
    }
    root.style.setProperty(
      '--tg-viewport-height',
      `${String(this.webApp.viewportHeight)}px`,
    )
    if (this.viewportHandler === null) {
      this.viewportHandler = () => {
        this.applyViewport()
      }
      this.webApp.onEvent('viewportChanged', this.viewportHandler)
    }
  }

  destroy(): void {
    if (this.viewportHandler !== null) {
      this.webApp.offEvent('viewportChanged', this.viewportHandler)
      this.viewportHandler = null
    }
    this.backButton.hide()
    this.mainButton.hide()
  }

  backButton = {
    show: (onClick: () => void) => {
      const api = this.webApp.BackButton
      if (api === undefined) {
        return
      }
      if (this.backHandler !== null) {
        api.offClick(this.backHandler)
      }
      this.backHandler = onClick
      api.onClick(onClick)
      api.show()
    },
    hide: () => {
      const api = this.webApp.BackButton
      if (api === undefined) {
        return
      }
      if (this.backHandler !== null) {
        api.offClick(this.backHandler)
        this.backHandler = null
      }
      api.hide()
    },
  }

  mainButton = {
    show: (text: string, onClick: () => void) => {
      const api = this.webApp.MainButton
      if (api === undefined) {
        return
      }
      if (this.mainHandler !== null) {
        api.offClick(this.mainHandler)
      }
      this.mainHandler = onClick
      api.setText(text)
      api.onClick(onClick)
      api.enable()
      api.show()
    },
    hide: () => {
      const api = this.webApp.MainButton
      if (api === undefined) {
        return
      }
      if (this.mainHandler !== null) {
        api.offClick(this.mainHandler)
        this.mainHandler = null
      }
      api.hide()
    },
  }

  haptic(kind: HapticKind): void {
    const api = this.webApp.HapticFeedback
    if (api === undefined) {
      return
    }
    try {
      if (kind === 'light') {
        api.impactOccurred('light')
        return
      }
      api.notificationOccurred(kind)
    } catch {
      return
    }
  }

  async checkHomeScreenStatus(): Promise<HomeScreenStatus> {
    const api = this.webApp.checkHomeScreenStatus
    if (api === undefined) {
      return 'unsupported'
    }
    return new Promise((resolve) => {
      try {
        api((status) => {
          resolve(status)
        })
      } catch {
        resolve('unsupported')
      }
    })
  }

  addToHomeScreen(): void {
    try {
      this.webApp.addToHomeScreen?.()
    } catch {
      return
    }
  }
}
