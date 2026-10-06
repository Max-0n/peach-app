interface CycleRingProps {
  day: number | null
  length: number
  label: string
  caption: string
}

export function CycleRing({ day, length, label, caption }: CycleRingProps) {
  const progress = day === null || length <= 0 ? 0 : Math.min(day / length, 1)
  const radius = 54
  const circumference = 2 * Math.PI * radius

  return (
    <svg
      aria-label={`${label}. ${caption}`}
      className="mx-auto size-44"
      role="img"
      viewBox="0 0 140 140"
    >
      <circle
        className="fill-none stroke-line"
        cx="70"
        cy="70"
        r={radius}
        strokeWidth="10"
      />
      <circle
        className="fill-none stroke-plum"
        cx="70"
        cy="70"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        strokeLinecap="round"
        strokeWidth="10"
        transform="rotate(-90 70 70)"
      />
      <text
        className="fill-foreground"
        fontFamily="Georgia, serif"
        fontSize="28"
        textAnchor="middle"
        x="70"
        y="68"
      >
        {day ?? '—'}
      </text>
      <text
        className="fill-muted"
        fontSize="11"
        textAnchor="middle"
        x="70"
        y="90"
      >
        {caption}
      </text>
    </svg>
  )
}
