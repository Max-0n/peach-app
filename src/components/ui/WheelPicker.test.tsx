import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WheelPicker } from './WheelPicker'

describe('WheelPicker', () => {
  it('moves the value with arrow keys', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <WheelPicker
        aria-label="Cycle length"
        max={45}
        min={20}
        onChange={onChange}
        value={28}
      />,
    )

    const wheel = screen.getByRole('slider', { name: 'Cycle length' })
    wheel.focus()
    await user.keyboard('{ArrowDown}')
    expect(onChange).toHaveBeenCalledWith(29)

    onChange.mockClear()
    await user.keyboard('{ArrowUp}')
    expect(onChange).toHaveBeenCalledWith(27)
  })
})
