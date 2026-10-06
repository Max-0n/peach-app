import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: ReactNode
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="font-editorial text-4xl tracking-tight text-balance sm:text-5xl">
        {title}
      </h1>
      {subtitle === undefined ? null : (
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted">{subtitle}</p>
      )}
      {children === undefined ? null : <div className="mt-6">{children}</div>}
    </header>
  )
}
