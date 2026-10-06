import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../../App'
import { useLocaleStore } from '../../app/i18n/locale-store'
import { seedOnboarded } from '../../test/seed'

describe('logging', () => {
  it('opens a full-screen period range without flow or symptoms', async () => {
    await seedOnboarded()
    useLocaleStore.setState({ locale: 'en' })
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Log period' }))
    const dialog = screen.getByRole('dialog', { name: 'Period' })
    expect(dialog).toHaveAttribute('data-fullscreen', 'true')
    expect(screen.queryByRole('button', { name: 'Quick add' })).toBeNull()
    expect(screen.queryByText('Flow (optional)')).toBeNull()
    expect(screen.queryByText('Symptoms')).toBeNull()
  })
})
