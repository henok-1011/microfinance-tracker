import type { Contribution, Target } from '@/lib/types'

import { compareIso } from './date'
import { round2, sum } from './money'

export interface UserContributionSummary {
  userId: string
  expected: number
  contributed: number
  remaining: number
  progress: number
}

export function summarizeUser(
  userId: string,
  expected: number,
  contributions: Contribution[],
): UserContributionSummary {
  const contributed = sum(
    contributions.filter((entry) => entry.userId === userId).map((entry) => entry.amount),
  )
  return {
    userId,
    expected: round2(expected),
    contributed,
    remaining: round2(expected - contributed),
    progress: expected > 0 ? contributed / expected : 0,
  }
}

export function summarizeContributions(
  targets: Target[],
  contributions: Contribution[],
  year?: number,
): UserContributionSummary[] {
  const scopedTargets = year === undefined ? targets : targets.filter((t) => t.year === year)
  const scopedContributions =
    year === undefined ? contributions : contributions.filter((c) => c.year === year)

  return scopedTargets.map((target) =>
    summarizeUser(target.userId, target.amount, scopedContributions),
  )
}

export function totalExpected(targets: Target[], year?: number): number {
  return sum(
    (year === undefined ? targets : targets.filter((t) => t.year === year)).map((t) => t.amount),
  )
}

export function totalContributed(contributions: Contribution[], year?: number): number {
  return sum(
    (year === undefined ? contributions : contributions.filter((c) => c.year === year)).map(
      (c) => c.amount,
    ),
  )
}

/** Whole percent complete; exceeds 100 when a user over-contributes. */
export function progressPercent(progress: number): number {
  return Math.round(progress * 100)
}

export type ContributionSort = 'newest' | 'oldest' | 'largest'

/**
 * Year-scoped contributions ordered for display. Always returns a new array so
 * callers can sort Firestore-backed state without mutating it.
 */
export function contributionsForYear(
  contributions: Contribution[],
  year?: number,
  sort: ContributionSort = 'newest',
): Contribution[] {
  const scoped =
    year === undefined ? contributions.slice() : contributions.filter((c) => c.year === year)

  switch (sort) {
    case 'oldest':
      return scoped.sort(
        (a, b) => compareIso(a.date, b.date) || compareIso(a.createdAt, b.createdAt),
      )
    case 'largest':
      return scoped.sort((a, b) => b.amount - a.amount || compareIso(b.date, a.date))
    default:
      return scoped.sort(
        (a, b) => compareIso(b.date, a.date) || compareIso(b.createdAt, a.createdAt),
      )
  }
}
