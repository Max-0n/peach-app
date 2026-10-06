import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomSheet } from './BottomSheet'

describe('BottomSheet', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('exposes an accessible dialog labelled by its title', () => {
    render(
      <BottomSheet onClose={() => undefined} title="Quick add">
        <p>Choose what to log</p>
      </BottomSheet>,
    )

    expect(screen.getByRole('dialog', { name: 'Quick add' })).toBeVisible()
    expect(screen.getByText('Choose what to log')).toBeVisible()
  })

  it('invokes onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <BottomSheet onClose={onClose} title="Quick add">
        <button type="button">Inside</button>
      </BottomSheet>,
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
