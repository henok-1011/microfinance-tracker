import type { Contribution, Target } from '@/lib/types'

import { compareIso, isWithinRange, maxIso, targetYearForRange, type DateRange } from './date'
import { round2, sum } from './money'

export interface UserContributionSummary {
  userId: string
  expected: number
  contributed: number
  remaining: number
  progress: number
  /** Date of the member's newest counted payment, or null when none are in scope. */
  lastDate: string | null
}

export function summarizeUser(
  userId: string,
  expected: number,
  contributions: Contribution[],
): UserContributionSummary {
  const payments = contributions.filter((entry) => entry.userId === userId)
  const contributed = sum(payments.map((entry) => entry.amount))
  // The member's payments are already range-scoped by the caller, so the newest
  // one here is the newest inside the reporting period.
  const lastDate = payments.reduce<string | null>(
    (newest, entry) => (newest === null ? entry.date : maxIso(newest, entry.date)),
    null,
  )
  return {
    userId,
    expected: round2(expected),
    contributed,
    remaining: round2(expected - contributed),
    progress: expected > 0 ? contributed / expected : 0,
    lastDate,
  }
}

/** Targets for the year a range starts in; every target when unbounded. */
function scopeTargets(targets: Target[], range?: DateRange): Target[] {
  if (!range) return targets
  const year = targetYearForRange(range)
  return targets.filter((target) => target.year === year)
}

/** Contributions paid inside the range's dates; every entry when unbounded. */
function scopeContributions(contributions: Contribution[], range?: DateRange): Contribution[] {
  if (!range) return contributions
  return contributions.filter((entry) => isWithinRange(entry.date, range))
}

/**
 * Per-member progress over a period.
 *
 * Contributions are matched on their actual `date`, while targets are matched to
 * the year the range starts in — targets only exist per year. So a range that
 * reaches into a second year still compares against the first year's target.
 */
export function summarizeContributions(
  targets: Target[],
  contributions: Contribution[],
  range?: DateRange,
): UserContributionSummary[] {
  const scoped = scopeContributions(contributions, range)
  return scopeTargets(targets, range).map((target) =>
    summarizeUser(target.userId, target.amount, scoped),
  )
}

export function totalExpected(targets: Target[], range?: DateRange): number {
  return sum(scopeTargets(targets, range).map((target) => target.amount))
}

export function totalContributed(contributions: Contribution[], range?: DateRange): number {
  return sum(scopeContributions(contributions, range).map((entry) => entry.amount))
}

/** Whole percent complete; exceeds 100 when a user over-contributes. */
export function progressPercent(progress: number): number {
  return Math.round(progress * 100)
}

export type ContributionSort = 'newest' | 'oldest' | 'largest'

/** Orders a copy of the list, so Firestore-backed state is never mutated. */
function ordered(contributions: Contribution[], sort: ContributionSort): Contribution[] {
  const entries = contributions.slice()
  switch (sort) {
    case 'oldest':
      return entries.sort(
        (a, b) => compareIso(a.date, b.date) || compareIso(a.createdAt, b.createdAt),
      )
    case 'largest':
      return entries.sort((a, b) => b.amount - a.amount || compareIso(b.date, a.date))
    default:
      return entries.sort(
        (a, b) => compareIso(b.date, a.date) || compareIso(b.createdAt, a.createdAt),
      )
  }
}

/**
 * Year-scoped contributions for the admin list, which filters on the stored
 * `year` field so the list agrees with the year chosen on the record form.
 */
export function contributionsForYear(
  contributions: Contribution[],
  year?: number,
  sort: ContributionSort = 'newest',
): Contribution[] {
  const scoped =
    year === undefined ? contributions : contributions.filter((entry) => entry.year === year)
  return ordered(scoped, sort)
}

/**
 * Date-scoped contributions for the reports, which filter on the actual `date`
 * so a period reports what was really paid inside it.
 */
export function contributionsInRange(
  contributions: Contribution[],
  range?: DateRange,
  sort: ContributionSort = 'newest',
): Contribution[] {
  return ordered(scopeContributions(contributions, range), sort)
}

/** The newest `limit` contributions overall, newest first. */
export function latestContributions(contributions: Contribution[], limit = 5): Contribution[] {
  return ordered(contributions, 'newest').slice(0, Math.max(0, limit))
}
