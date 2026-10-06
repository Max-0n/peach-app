/// <reference types="node" />

import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

const timeZones = [
  'UTC',
  'America/Los_Angeles',
  'Pacific/Kiritimati',
  'Pacific/Apia',
] as const
const vitestEntry = resolve('node_modules/vitest/vitest.mjs')

describe('local-date timezone matrix', () => {
  it('produces identical calendar and cycle boundaries in every timezone', () => {
    const results = timeZones.map((timeZone) => {
      const output = execFileSync(
        process.execPath,
        [
          vitestEntry,
          'run',
          'src/domain/cycle/timezone-case.test.ts',
          '--reporter=verbose',
        ],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          env: { ...process.env, TZ: timeZone },
        },
      )
      const match = /TZ_RESULT:(\{[^\n]+\})/.exec(output)
      expect(match, `missing timezone result for ${timeZone}`).not.toBeNull()
      return match?.[1]
    })

    expect(new Set(results).size).toBe(1)
    expect(JSON.parse(results[0] ?? '')).toEqual({
      leapDay: '2024-02-29',
      afterLeapDay: '2024-03-01',
      springDstDay: '2026-03-09',
      fallDstDay: '2026-11-02',
      apiaSkippedDay: '2011-12-30',
      dayDifference: 2,
      periodEnd: '2026-01-04',
      fertileStart: '2026-01-11',
      ovulation: '2026-01-16',
      fertileEnd: '2026-01-17',
      nextPeriod: '2026-01-30',
    })
  }, 15_000)
})
