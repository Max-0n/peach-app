import {
  CalendarDays,
  HeartHandshake,
  Home,
  Lightbulb,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import type { TranslationKey } from '../i18n/dictionary'
import { useTranslation } from '../i18n/locale-context'

interface NavigationItem {
  icon: LucideIcon
  labelKey: TranslationKey
  to: string
}

const navigation: NavigationItem[] = [
  { icon: Home, labelKey: 'nav.home', to: '/' },
  { icon: CalendarDays, labelKey: 'nav.calendar', to: '/calendar' },
  { icon: Lightbulb, labelKey: 'nav.insights', to: '/insights' },
  { icon: UserRound, labelKey: 'nav.profile', to: '/profile' },
  {
    icon: HeartHandshake,
    labelKey: 'nav.recommendations',
    to: '/recommendations',
  },
]

function Navigation() {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t('nav.primary')}
      className="flex w-full items-center justify-around md:flex-col md:items-stretch md:gap-2"
    >
      {navigation.map(({ icon: Icon, labelKey, to }) => (
        <NavLink
          className={({ isActive }) =>
            `flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-xs font-medium transition md:flex-row md:justify-start md:gap-3 md:px-3 md:text-sm ${
              isActive
                ? 'bg-sage-soft text-foreground'
                : 'text-muted hover:bg-surface'
            }`
          }
          end={to === '/'}
          key={to}
          to={to}
        >
          <Icon aria-hidden="true" size={20} />
          <span className="max-w-16 truncate md:max-w-none">{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell() {
  const { t } = useTranslation()

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16rem_minmax(0,1fr)]">
      <a className="skip-link" href="#main-content">
        {t('action.skipToContent')}
      </a>
      <aside className="hidden border-r border-line bg-surface/70 px-5 py-8 md:flex md:flex-col">
        <div className="mb-12 flex items-center gap-3 px-2">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-full bg-plum text-xl text-ivory"
          >
            P
          </span>
          <span className="font-editorial text-2xl">{t('app.name')}</span>
        </div>
        <Navigation />
      </aside>

      <main
        className="min-w-0 px-5 pt-[calc(2rem+var(--app-safe-top))] pb-[calc(7rem+var(--app-safe-bottom))] sm:px-8 md:px-12 md:pt-12 md:pb-24 lg:px-16"
        id="main-content"
      >
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-background/95 px-2 pt-2 pb-[calc(0.5rem+var(--app-safe-bottom))] backdrop-blur md:hidden">
        <Navigation />
      </div>
    </div>
  )
}
