import type {
  HapticKind,
  HomeScreenStatus,
  TelegramClient,
  TelegramThemeParams,
} from './types'

function ignore(value: unknown): void {
  if (value === '__never__') {
    throw new Error('unreachable')
  }
}

export class BrowserTelegramClient implements TelegramClient {
  readonly isTelegram = false
  readonly user = null
  readonly themeParams: TelegramThemeParams = {}
  readonly colorScheme = null
  readonly cloud = null
  readonly device = null

  ready(): void {
    ignore('ready')
  }

  expand(): void {
    ignore('expand')
  }

  applyViewport(): void {
    ignore('viewport')
  }

  destroy(): void {
    ignore('destroy')
  }

  backButton = {
    show: (onClick: () => void) => {
      ignore(onClick)
    },
    hide: () => {
      ignore('hide')
    },
  }

  mainButton = {
    show: (text: string, onClick: () => void) => {
      ignore(text)
      ignore(onClick)
    },
    hide: () => {
      ignore('hide')
    },
  }

  haptic(kind: HapticKind): void {
    ignore(kind)
  }

  checkHomeScreenStatus(): Promise<HomeScreenStatus> {
    return Promise.resolve('unsupported')
  }

  addToHomeScreen(): void {
    ignore('home')
  }
}
