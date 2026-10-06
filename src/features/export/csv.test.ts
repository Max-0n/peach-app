import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, type Cycle, type FlowEntry } from '../../domain'
import { createLocalDate } from '../../domain/cycle/types'
import {
  buildCsv,
  CSV_HEADER,
  escapeCsvValue,
  type CsvExportInput,
} from './csv'

const meta = {
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  revision: 1,
  sourceId: 'device-1',
  schemaVersion: SCHEMA_VERSION,
} as const

function emptyInput(overrides: Partial<CsvExportInput> = {}): CsvExportInput {
  return {
    cycles: [],
    flow: [],
    symptoms: [],
    mood: [],
    weight: [],
    notes: [],
    sexualActivity: [],
    averageCycleLength: 28,
    averagePeriodDuration: 5,
    lutealPhaseLength: 14,
    pregnancyMode: 'tracking',
    ...overrides,
  }
}

describe('escapeCsvValue', () => {
  it('leaves simple values unquoted', () => {
    expect(escapeCsvValue('medium')).toBe('medium')
  })

  it('quotes and doubles internal quotes when a value contains a comma, quote, or newline', () => {
    expect(escapeCsvValue('heavy, clots')).toBe('"heavy, clots"')
    expect(escapeCsvValue('she said "ok"')).toBe('"she said ""ok"""')
    expect(escapeCsvValue('line one\nline two')).toBe('"line one\nline two"')
  })
})

describe('buildCsv', () => {
  it('prefixes the document with a UTF-8 BOM and a daily header row', () => {
    const csv = buildCsv(emptyInput())
    expect(csv.startsWith('\uFEFF')).toBe(true)
    const header = csv.slice(1).split(/\r?\n/)[0]
    expect(header).toBe(CSV_HEADER.join(','))
  })

  it('emits one local-date row with computed cycle fields and escaped notes', () => {
    const cycle: Cycle = {
      ...meta,
      id: 'cycle:2026-10-01',
      startDate: createLocalDate('2026-10-01'),
      endDate: createLocalDate('2026-10-05'),
    }
    const flow: FlowEntry = {
      ...meta,
      id: 'flow:2026-10-02',
      date: createLocalDate('2026-10-02'),
      flow: 'medium',
      notes: 'cramps, "mild"',
    }
    const csv = buildCsv(
      emptyInput({
        cycles: [cycle],
        flow: [flow],
        heightCm: 168,
      }),
    )
    const dataLine = csv
      .slice(1)
      .split(/\r?\n/)
      .find((line) => line.startsWith('2026-10-02,'))
    expect(dataLine).toBeDefined()
    expect(dataLine).toContain(',2,')
    expect(dataLine).toContain('menstrual')
    expect(dataLine).toContain('medium')
    expect(dataLine).toContain('"cramps, ""mild"""')
  })
})
