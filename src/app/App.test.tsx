import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { createDataLayer } from '../features/storage'
import { SOURCE_ID_KEY } from '../features/telegram/sourceId'
import { seedOnboarded } from '../test/seed'
import { useLocaleStore } from './i18n/locale-store'

describe('application routing', () => {
  beforeEach(() => {
    localStorage.clear()
    useLocaleStore.setState({ locale: 'en' })
  })

  it('sends a first launch to onboarding', async () => {
    render(
      <MemoryRouter initialEntries={['/insights']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Your usual rhythm' }),
    ).toBeInTheDocument()
  })

  it('renders the requested page inside the app shell', async () => {
    await seedOnboarded()
    render(
      <MemoryRouter initialEntries={['/insights']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Insights' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('navigation', { name: 'Primary' })).toHaveLength(
      2,
    )
    expect(
      screen.getByRole('link', { name: 'Skip to content' }),
    ).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')

    for (const link of screen.getAllByRole('link', { name: 'Insights' })) {
      expect(link).toHaveAttribute('aria-current', 'page')
    }
  })

  it('redirects unknown routes to home', async () => {
    await seedOnboarded()
    render(
      <MemoryRouter initialEntries={['/not-a-route']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'A quiet view of today.' }),
    ).toBeInTheDocument()
  })

  it('translates navigation landmarks', async () => {
    localStorage.setItem(SOURCE_ID_KEY, 'test-source')
    const { repository, db } = createDataLayer({ sourceId: 'test-source' })
    await repository.saveSettings({
      onboardingCompleted: true,
      locale: 'ru',
    })
    db.close()
    useLocaleStore.setState({ locale: 'ru' })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getAllByRole('navigation', { name: 'Основная навигация' }),
      ).toHaveLength(2)
    })
  })
})
