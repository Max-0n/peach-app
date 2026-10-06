import { Navigate, Route, Routes } from 'react-router-dom'
import { LocaleProvider } from './app/i18n/LocaleProvider'
import { AppShell } from './app/layout/AppShell'
import { DataProvider } from './features/data/DataProvider'
import { LocaleSync } from './features/data/LocaleSync'
import { TelegramProvider } from './features/telegram/TelegramProvider'
import { ThemeSync } from './features/theme/ThemeSync'
import { useData } from './features/data/data-context'
import { CalendarPage } from './pages/calendar/CalendarPage'
import { HomePage } from './pages/home/HomePage'
import { InsightsPage } from './pages/insights/InsightsPage'
import { OnboardingPage } from './pages/onboarding/OnboardingPage'
import { ProfilePage } from './pages/profile/ProfilePage'
import { RecommendationsPage } from './pages/recommendations/RecommendationsPage'

function AppRoutes() {
  const onboarded = useData().settings?.onboardingCompleted === true

  return (
    <Routes>
      <Route
        path="/onboarding"
        element={onboarded ? <Navigate replace to="/" /> : <OnboardingPage />}
      />
      <Route
        element={
          onboarded ? <AppShell /> : <Navigate replace to="/onboarding" />
        }
      >
        <Route index element={<HomePage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

function App() {
  return (
    <LocaleProvider>
      <TelegramProvider>
        <DataProvider>
          <ThemeSync />
          <LocaleSync />
          <AppRoutes />
        </DataProvider>
      </TelegramProvider>
    </LocaleProvider>
  )
}

export default App
