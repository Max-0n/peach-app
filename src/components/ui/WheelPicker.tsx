import { useLayoutEffect, useMemo, useRef, type KeyboardEvent } from 'react'

export const WHEEL_ITEM_HEIGHT = 44
export const WHEEL_VISIBLE_COUNT = 5

interface WheelPickerProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  'aria-label': string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function WheelPicker({
  value,
  min,
  max,
  onChange,
  'aria-label': ariaLabel,
}: WheelPickerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const ignoreScrollRef = useRef(false)
  const values = useMemo(() => {
    const items: number[] = []
    for (let next = min; next <= max; next += 1) {
      items.push(next)
    }
    return items
  }, [min, max])
  const pad = ((WHEEL_VISIBLE_COUNT - 1) / 2) * WHEEL_ITEM_HEIGHT
  const selected = clamp(value, min, max)

  useLayoutEffect(() => {
    const node = scrollerRef.current
    if (node === null) {
      return
    }
    ignoreScrollRef.current = true
    node.scrollTop = (selected - min) * WHEEL_ITEM_HEIGHT
    const frame = requestAnimationFrame(() => {
      ignoreScrollRef.current = false
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [min, selected])

  function commit(next: number): void {
    const clamped = clamp(next, min, max)
    if (clamped !== value) {
      onChange(clamped)
    }
  }

  function handleScroll(): void {
    const node = scrollerRef.current
    if (node === null || ignoreScrollRef.current) {
      return
    }
    commit(min + Math.round(node.scrollTop / WHEEL_ITEM_HEIGHT))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault()
      commit(selected - 1)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault()
      commit(selected + 1)
    }
  }

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 top-1/2 h-11 -translate-y-1/2 rounded-2xl bg-foreground/5"
      />
      <div
        aria-label={ariaLabel}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={selected}
        className="wheel-picker relative h-[13.75rem] overflow-y-auto overscroll-contain snap-y snap-mandatory outline-none"
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        ref={scrollerRef}
        role="slider"
        tabIndex={0}
      >
        <div aria-hidden="true" style={{ height: pad }} />
        {values.map((item) => (
          <div
            className={`flex h-11 w-full cursor-pointer snap-center items-center justify-center text-lg tabular-nums transition ${
              item === selected
                ? 'font-semibold text-foreground'
                : 'text-muted/70'
            }`}
            key={item}
            onClick={() => {
              commit(item)
            }}
          >
            {item}
          </div>
        ))}
        <div aria-hidden="true" style={{ height: pad }} />
      </div>
    </div>
  )
}
