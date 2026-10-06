import type { ButtonHTMLAttributes } from 'react'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
}

export function Chip({
  selected = false,
  className = '',
  type = 'button',
  ...props
}: ChipProps) {
  return (
    <button
      aria-pressed={selected}
      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition ${
        selected
          ? 'border-plum bg-plum text-ivory'
          : 'border-line bg-surface text-foreground hover:border-plum/40'
      } ${className}`}
      type={type}
      {...props}
    />
  )
}
