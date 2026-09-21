import { describe, expect, it } from 'vitest'

import {
  contributionsForYear,
  progressPercent,
  summarizeContributions,
  summarizeUser,
  totalContributed,
  totalExpected,
} from '@/lib/calc/contributions'
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
})

describe('summarizeContributions', () => {
  it('scopes targets and contributions to a year', () => {
    const summaries = summarizeContributions(targets, contributions, 2026)
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
    expect(summarizeContributions([], [contribution('u9', 2026, 500)], 2026)).toEqual([])
  })

  it('treats a target with no contributions as fully remaining', () => {
    const [summary] = summarizeContributions([target('u3', 2026, 4000)], [], 2026)
    expect(summary).toMatchObject({ contributed: 0, remaining: 4000, progress: 0 })
  })

  it('keeps years independent when scoped', () => {
    const summaries = summarizeContributions(targets, contributions, 2025)
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

describe('totals', () => {
  it('sums targets and contributions per year', () => {
    expect(totalExpected(targets, 2026)).toBe(18000)
    expect(totalExpected(targets)).toBe(28000)
    expect(totalContributed(contributions, 2026)).toBe(13000)
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
  function dated(id: string, date: string, amount: number, createdAt: string): Contribution {
    return {
      id,
      userId: 'u1',
      year: Number(date.slice(0, 4)),
      amount,
      date,
      note: '',
      recordedBy: 'admin',
      createdAt,
    }
  }

  const entries = [
    dated('c1', '2026-03-01', 100, '2026-03-01T10:00:00.000Z'),
    dated('c2', '2026-01-01', 50, '2026-01-01T10:00:00.000Z'),
    dated('c3', '2026-02-01', 500, '2026-02-01T10:00:00.000Z'),
    dated('c4', '2025-12-01', 700, '2025-12-01T10:00:00.000Z'),
  ]

  it('defaults to newest first and scopes to the year', () => {
    expect(contributionsForYear(entries, 2026).map((entry) => entry.id)).toEqual(['c1', 'c3', 'c2'])
  })

  it('sorts oldest first', () => {
    expect(contributionsForYear(entries, 2026, 'oldest').map((entry) => entry.id)).toEqual([
      'c2',
      'c3',
      'c1',
    ])
  })

  it('sorts by amount descending', () => {
    expect(contributionsForYear(entries, 2026, 'largest').map((entry) => entry.id)).toEqual([
      'c3',
      'c1',
      'c2',
    ])
  })

  it('breaks date ties with createdAt', () => {
    const sameDay = [
      dated('early', '2026-05-01', 10, '2026-05-01T08:00:00.000Z'),
      dated('late', '2026-05-01', 10, '2026-05-01T20:00:00.000Z'),
    ]
    expect(contributionsForYear(sameDay, 2026).map((entry) => entry.id)).toEqual(['late', 'early'])
  })

  it('returns every year when no year is given, without mutating the input', () => {
    const input = [...entries]
    const result = contributionsForYear(input, undefined, 'oldest')
    expect(result).toHaveLength(4)
    expect(input.map((entry) => entry.id)).toEqual(['c1', 'c2', 'c3', 'c4'])
  })
})
