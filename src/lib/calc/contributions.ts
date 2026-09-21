import type { Contribution, Target } from '@/lib/types'

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
