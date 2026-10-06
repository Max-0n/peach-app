export interface MergeableRecord {
  readonly id: string
  readonly revision: number
  readonly updatedAt: string
  readonly sourceId: string
  readonly createdAt?: string
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    )
  }
  return value
}

function stableContent(record: MergeableRecord): string {
  return JSON.stringify(stableValue(record))
}

export function compareRecords<T extends MergeableRecord>(
  left: T,
  right: T,
): number {
  return (
    left.revision - right.revision ||
    left.updatedAt.localeCompare(right.updatedAt) ||
    left.sourceId.localeCompare(right.sourceId) ||
    stableContent(left).localeCompare(stableContent(right))
  )
}

export function recordDominates(
  winner: MergeableRecord,
  other: MergeableRecord,
): boolean {
  return compareRecords(winner, other) > 0
}

export function mergeRecords<T extends MergeableRecord>(
  local: readonly T[],
  cloud: readonly T[],
): T[] {
  const winners = new Map<string, T>()
  for (const candidate of [...local, ...cloud]) {
    const current = winners.get(candidate.id)
    if (current === undefined || compareRecords(current, candidate) < 0) {
      winners.set(candidate.id, candidate)
    }
  }
  return Array.from(winners.values()).sort((left, right) =>
    left.id.localeCompare(right.id),
  )
}

export function bucketForDate(entity: string, date: string): string {
  const match = /^(\d{4})-(\d{2})-\d{2}$/u.exec(date)
  const year = match?.[1]
  const month = match?.[2]
  if (year === undefined || month === undefined) {
    throw new Error('A local YYYY-MM-DD date is required.')
  }
  return `${entity}_${year}_${month}`
}

export function bucketsForRange(
  entity: string,
  from: string,
  to: string,
): string[] {
  if (to < from) throw new Error('Range end cannot precede range start.')
  const startMatch = /^(\d{4})-(\d{2})-\d{2}$/u.exec(from)
  const endMatch = /^(\d{4})-(\d{2})-\d{2}$/u.exec(to)
  if (startMatch === null || endMatch === null) {
    throw new Error('Local YYYY-MM-DD dates are required.')
  }
  let year = Number(startMatch[1])
  let month = Number(startMatch[2])
  const endYear = Number(endMatch[1])
  const endMonth = Number(endMatch[2])
  const buckets: string[] = []
  while (year < endYear || (year === endYear && month <= endMonth)) {
    buckets.push(
      `${entity}_${year.toString().padStart(4, '0')}_${month.toString().padStart(2, '0')}`,
    )
    month += 1
    if (month === 13) {
      month = 1
      year += 1
    }
  }
  return buckets
}
