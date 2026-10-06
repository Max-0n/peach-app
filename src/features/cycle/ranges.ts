import type { Cycle, CycleDateRange } from '../../domain'

export function toCycleRanges(
  cycles: readonly Pick<Cycle, 'startDate' | 'endDate'>[],
): CycleDateRange[] {
  return cycles.map((cycle) => ({
    startDate: cycle.startDate,
    ...(cycle.endDate === undefined ? {} : { endDate: cycle.endDate }),
  }))
}
