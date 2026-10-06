import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface BottomSheetProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  fullScreen?: boolean
}

export function BottomSheet({
  title,
  onClose,
  children,
  footer,
  fullScreen = false,
}: BottomSheetProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement
    dialogRef.current?.focus()

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = originalOverflow
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
  }, [onClose])

  return createPortal(
    <div
      className={
        fullScreen
          ? 'fixed inset-0 z-50 flex'
          : 'fixed inset-0 z-50 flex items-end justify-center sm:items-center'
      }
    >
      {fullScreen ? null : (
        <button
          aria-label="Close"
          className="absolute inset-0 bg-charcoal/40"
          onClick={onClose}
          type="button"
        />
      )}
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={
          fullScreen
            ? 'relative z-10 flex h-dvh w-full flex-col bg-background pt-[var(--app-safe-top)]'
            : 'relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl bg-background shadow-soft sm:rounded-3xl'
        }
        data-fullscreen={fullScreen ? 'true' : 'false'}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="font-editorial text-2xl" id={titleId}>
            {title}
          </h2>
          <button
            className="grid size-11 place-items-center rounded-full text-muted hover:bg-surface"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer === undefined ? null : (
          <div className="border-t border-line px-5 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}
