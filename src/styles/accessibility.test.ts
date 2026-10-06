import { describe, expect, it } from 'vitest'
import styles from '../index.css?raw'

function colorVariable(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(styles)
  if (!match?.[1]) {
    throw new Error(`Missing color variable --${name}`)
  }
  return match[1]
}

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255)

  if (channels?.length !== 3) {
    throw new Error(`Invalid hex color: ${hex}`)
  }

  const normalized = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  const red = normalized[0]
  const green = normalized[1]
  const blue = normalized[2]
  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error(`Invalid hex color: ${hex}`)
  }

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  )
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  )
  return (lighter + 0.05) / (darker + 0.05)
}

describe('light theme color accessibility', () => {
  it.each(['muted', 'sage'])(
    'keeps --%s at WCAG AA contrast against ivory',
    (name) => {
      expect(
        contrastRatio(colorVariable(name), colorVariable('ivory')),
      ).toBeGreaterThanOrEqual(4.5)
    },
  )
})
