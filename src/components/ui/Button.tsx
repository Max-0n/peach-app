import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

const variantClass = {
  primary: 'bg-plum text-ivory shadow-soft hover:brightness-105',
  secondary: 'bg-sage-soft text-foreground hover:brightness-95',
  ghost: 'bg-transparent text-muted hover:bg-surface hover:text-foreground',
  danger: 'bg-plum text-ivory hover:brightness-105',
} as const

export function Button({
  className = '',
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 font-semibold transition ${variantClass[variant]} ${className}`}
      type={type}
      {...props}
    />
  )
}
