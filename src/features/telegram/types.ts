import type { TelegramKeyValueApi } from '../storage/adapters/TelegramStorage'

export interface TelegramThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
  header_bg_color?: string
  accent_text_color?: string
  section_bg_color?: string
  section_header_text_color?: string
  subtitle_text_color?: string
  destructive_text_color?: string
  bottom_bar_bg_color?: string
}

export interface TelegramSafeArea {
  top: number
  bottom: number
  left: number
  right: number
}

export interface TelegramUserRaw {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface TelegramUser {
  id: number
  firstName: string
  lastName?: string
  username?: string
  languageCode?: string
}

export type HomeScreenStatus = 'unsupported' | 'unknown' | 'added' | 'missed'
export type HapticKind = 'light' | 'success' | 'warning' | 'error'

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: { user?: TelegramUserRaw }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: TelegramThemeParams
  viewportHeight: number
  viewportStableHeight: number
  isExpanded: boolean
  safeAreaInset?: TelegramSafeArea
  contentSafeAreaInset?: TelegramSafeArea
  ready: () => void
  expand: () => void
  close?: () => void
  onEvent: (event: string, handler: () => void) => void
  offEvent: (event: string, handler: () => void) => void
  BackButton?: {
    isVisible: boolean
    show: () => void
    hide: () => void
    onClick: (fn: () => void) => void
    offClick: (fn: () => void) => void
  }
  MainButton?: {
    text: string
    isVisible: boolean
    setText: (text: string) => void
    show: () => void
    hide: () => void
    onClick: (fn: () => void) => void
    offClick: (fn: () => void) => void
    enable: () => void
    disable: () => void
  }
  HapticFeedback?: {
    impactOccurred: (
      style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft',
    ) => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  CloudStorage?: TelegramKeyValueApi
  DeviceStorage?: TelegramKeyValueApi
  checkHomeScreenStatus?: (callback: (status: HomeScreenStatus) => void) => void
  addToHomeScreen?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
}

export interface TelegramBackButtonControls {
  show: (onClick: () => void) => void
  hide: () => void
}

export interface TelegramMainButtonControls {
  show: (text: string, onClick: () => void) => void
  hide: () => void
}

export interface TelegramClient {
  readonly isTelegram: boolean
  readonly user: TelegramUser | null
  readonly themeParams: TelegramThemeParams
  readonly colorScheme: 'light' | 'dark' | null
  readonly cloud: import('../storage/adapters/AppStorage').RawAppStorage | null
  readonly device: import('../storage/adapters/AppStorage').RawAppStorage | null
  ready: () => void
  expand: () => void
  applyViewport: () => void
  destroy: () => void
  backButton: TelegramBackButtonControls
  mainButton: TelegramMainButtonControls
  haptic: (kind: HapticKind) => void
  checkHomeScreenStatus: () => Promise<HomeScreenStatus>
  addToHomeScreen: () => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}
