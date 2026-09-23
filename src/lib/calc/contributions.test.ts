import { describe, expect, it } from 'vitest'

import {
  contributionsForYear,
  contributionsInRange,
  latestContributions,
  progressPercent,
  summarizeContributions,
  summarizeUser,
  totalContributed,
  totalExpected,
} from '@/lib/calc/contributions'
import { yearRange, type DateRange } from '@/lib/calc/date'
import type { Contribution, Target } from '@/lib/types'

function target(userId: string, year: number, amount: number): Target {
  return { id: `${userId}_${year}`, userId, year, amount }
}

function contribution(userId: string, year: number, amount: number): Contribution {
  return {
    id: `${userId}_${year}_${amount}`,
    userId,
    year,
    amount,
    date: `${year}-01-15`,
    note: '',
    recordedBy: 'admin',
    createdAt: `${year}-01-15T00:00:00.000Z`,
  }
}

/** Contribution with an explicit date, defaulting to the same-day createdAt order. */
function entry(
  id: string,
  date: string,
  amount: number,
  overrides: Partial<Contribution> = {},
): Contribution {
  return {
    userId: 'u1',
    year: Number(date.slice(0, 4)),
    note: '',
    recordedBy: 'admin',
    createdAt: `${date}T10:00:00.000Z`,
    ...overrides,
    id,
    date,
    amount,
  }
}

const targets = [target('u1', 2026, 12000), target('u2', 2026, 6000), target('u1', 2025, 10000)]
const contributions = [
  contribution('u1', 2026, 5000),
  contribution('u1', 2026, 2000),
  contribution('u2', 2026, 6000),
  contribution('u1', 2025, 10000),
]

describe('summarizeUser', () => {
  it('sums a user contributions against their target', () => {
    const summary = summarizeUser('u1', 12000, contributions)
    expect(summary).toMatchObject({ expected: 12000, contributed: 17000, remaining: -5000 })
  })

  it('reports progress and negative remaining for over-contribution', () => {
    const summary = summarizeUser('u1', 1000, [contribution('u1', 2026, 1500)])
    expect(summary.remaining).toBe(-500)
    expect(summary.progress).toBe(1.5)
  })

  it('guards against a zero target', () => {
    expect(summarizeUser('u1', 0, []).progress).toBe(0)
  })

  it('reports the newest payment date for the report', () => {
    const summary = summarizeUser('u1', 12000, [
      entry('older', '2026-02-01', 100),
      entry('newer', '2026-05-20', 200),
      entry('middle', '2026-03-11', 50),
    ])
    expect(summary.lastDate).toBe('2026-05-20')
  })

  it('has no date when the member paid nothing in scope', () => {
    expect(summarizeUser('u1', 12000, []).lastDate).toBeNull()
    // Someone else's payment must not become this member's date.
    expect(
      summarizeUser('u1', 12000, [entry('other', '2026-02-01', 100, { userId: 'u2' })]),
    ).toMatchObject({ contributed: 0, lastDate: null })
  })
})

describe('summarizeContributions', () => {
  it('scopes targets and contributions to a year', () => {
    const summaries = summarizeContributions(targets, contributions, yearRange(2026))
    expect(summaries).toHaveLength(2)
    expect(summaries[0]).toMatchObject({
      userId: 'u1',
      expected: 12000,
      contributed: 7000,
      remaining: 5000,
    })
    expect(summaries[1]).toMatchObject({
      userId: 'u2',
      expected: 6000,
      contributed: 6000,
      remaining: 0,
    })
  })
})

describe('edge cases', () => {
  it('omits users who contributed without a target for the year', () => {
    expect(summarizeContributions([], [contribution('u9', 2026, 500)], yearRange(2026))).toEqual([])
  })

  it('treats a target with no contributions as fully remaining', () => {
    const [summary] = summarizeContributions([target('u3', 2026, 4000)], [], yearRange(2026))
    expect(summary).toMatchObject({ contributed: 0, remaining: 4000, progress: 0 })
  })

  it('keeps years independent when scoped', () => {
    const summaries = summarizeContributions(targets, contributions, yearRange(2025))
    expect(summaries).toHaveLength(1)
    expect(summaries[0]).toMatchObject({
      userId: 'u1',
      expected: 10000,
      contributed: 10000,
      remaining: 0,
    })
  })

  it('rounds contributed totals to two decimals', () => {
    const summary = summarizeUser('u4', 100, [
      contribution('u4', 2026, 33.333),
      contribution('u4', 2026, 33.333),
    ])
    expect(summary.contributed).toBe(66.67)
    expect(summary.remaining).toBe(33.33)
  })
})

describe('range scoping', () => {
  const entries = [
    entry('before', '2025-12-31', 1),
    entry('start', '2026-01-01', 10),
    entry('middle', '2026-03-15', 100),
    entry('end', '2026-06-30', 1000),
    entry('after', '2026-07-01', 10_000),
  ]
  const janToJun: DateRange = { from: '2026-01-01', to: '2026-06-30' }

  it('counts only contributions inside the range, both bounds included', () => {
    expect(contributionsInRange(entries, janToJun).map((item) => item.id)).toEqual([
      'end',
      'middle',
      'start',
    ])
  })

  it('borrows the target from the range start year', () => {
    const [summary] = summarizeContributions([target('u1', 2026, 12000)], entries, janToJun)
    expect(summary).toMatchObject({ expected: 12000, contributed: 1110 })
  })

  it('keeps the start-year target when a range reaches into the next year', () => {
    const straddling: DateRange = { from: '2026-11-01', to: '2027-02-28' }
    const straddlingEntries = [entry('nov', '2026-11-10', 500), entry('feb', '2027-02-10', 700)]
    const [summary] = summarizeContributions(
      [target('u1', 2026, 800)],
      straddlingEntries,
      straddling,
    )
    // Both payments count, but the target is still 2026's.
    expect(summary).toMatchObject({ expected: 800, contributed: 1200, remaining: -400 })
  })

  it('reports nothing for an inverted range', () => {
    const inverted: DateRange = { from: '2026-06-30', to: '2026-01-01' }
    expect(contributionsInRange(entries, inverted)).toEqual([])
    expect(totalContributed(entries, inverted)).toBe(0)
  })
})

describe('totals', () => {
  it('sums targets and contributions per year', () => {
    expect(totalExpected(targets, yearRange(2026))).toBe(18000)
    expect(totalExpected(targets)).toBe(28000)
    expect(totalContributed(contributions, yearRange(2026))).toBe(13000)
    expect(totalContributed(contributions)).toBe(23000)
  })
})

describe('progressPercent', () => {
  it('rounds to a whole percent', () => {
    expect(progressPercent(0.756)).toBe(76)
    expect(progressPercent(1)).toBe(100)
    expect(progressPercent(0)).toBe(0)
  })

  it('reports over-contribution above 100', () => {
    expect(progressPercent(1.5)).toBe(150)
  })
})

describe('contributionsForYear', () => {
  const entries = [
    entry('c1', '2026-03-01', 100, { createdAt: '2026-03-01T10:00:00.000Z' }),
    entry('c2', '2026-01-01', 50, { createdAt: '2026-01-01T10:00:00.000Z' }),
    entry('c3', '2026-02-01', 500, { createdAt: '2026-02-01T10:00:00.000Z' }),
    entry('c4', '2025-12-01', 700, { createdAt: '2025-12-01T10:00:00.000Z' }),
  ]

  it('defaults to newest first and scopes to the year', () => {
    expect(contributionsForYear(entries, 2026).map((item) => item.id)).toEqual(['c1', 'c3', 'c2'])
  })

  it('sorts oldest first', () => {
    expect(contributionsForYear(entries, 2026, 'oldest').map((item) => item.id)).toEqual([
      'c2',
      'c3',
      'c1',
    ])
  })

  it('sorts by amount descending', () => {
    expect(contributionsForYear(entries, 2026, 'largest').map((item) => item.id)).toEqual([
      'c3',
      'c1',
      'c2',
    ])
  })

  it('breaks date ties with createdAt', () => {
    const sameDay = [
      entry('early', '2026-05-01', 10, { createdAt: '2026-05-01T08:00:00.000Z' }),
      entry('late', '2026-05-01', 10, { createdAt: '2026-05-01T20:00:00.000Z' }),
    ]
    expect(contributionsForYear(sameDay, 2026).map((item) => item.id)).toEqual(['late', 'early'])
  })

  it('returns every year when no year is given, without mutating the input', () => {
    const input = [...entries]
    const result = contributionsForYear(input, undefined, 'oldest')
    expect(result).toHaveLength(4)
    expect(input.map((item) => item.id)).toEqual(['c1', 'c2', 'c3', 'c4'])
  })
})

describe('contributionsInRange', () => {
  const entries = [
    entry('c1', '2026-03-01', 100),
    entry('c2', '2026-01-01', 50),
    entry('c3', '2026-02-01', 500),
  ]

  it('sorts oldest first inside the range', () => {
    expect(contributionsInRange(entries, yearRange(2026), 'oldest').map((item) => item.id)).toEqual(
      ['c2', 'c3', 'c1'],
    )
  })

  it('sorts largest first inside the range', () => {
    expect(
      contributionsInRange(entries, yearRange(2026), 'largest').map((item) => item.id),
    ).toEqual(['c3', 'c1', 'c2'])
  })

  it('returns everything when unbounded, without mutating the input', () => {
    const input = [...entries]
    const result = contributionsInRange(input, undefined, 'oldest')
    expect(result).toHaveLength(3)
    expect(input.map((item) => item.id)).toEqual(['c1', 'c2', 'c3'])
  })
})

describe('latestContributions', () => {
  const entries = [
    entry('c1', '2026-03-01', 100),
    entry('c2', '2026-01-01', 50),
    entry('c3', '2026-02-01', 500),
    entry('c4', '2026-04-01', 700),
  ]

  it('returns the newest entries, newest first', () => {
    expect(latestContributions(entries, 2).map((item) => item.id)).toEqual(['c4', 'c1'])
  })

  it('orders by date, not by the stored year field', () => {
    // A backdated record filed under 2026 must not outrank a real April payment.
    const backdated = entry('c5', '2025-12-31', 10, { year: 2026 })
    const ids = latestContributions([...entries, backdated], 4).map((item) => item.id)
    expect(ids).toEqual(['c4', 'c1', 'c3', 'c2'])
    expect(ids).not.toContain('c5')
  })

  it('defaults to five entries', () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      entry(`c${index}`, `2026-01-0${index + 1}`, index + 1),
    )
    expect(latestContributions(many)).toHaveLength(5)
  })

  it('handles an empty list and a zero limit', () => {
    expect(latestContributions([], 3)).toEqual([])
    expect(latestContributions(entries, 0)).toEqual([])
  })
})
