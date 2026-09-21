import type { Contribution, Loan, Repayment, Target } from '@/lib/types'

import { totalContributed, totalExpected } from './contributions'
import { maxIso } from './date'
import { loanBalanceAt } from './loans'
import { round2, sum } from './money'

export interface PoolSummary {
  totalExpected: number
  totalContributed: number
  outstandingContributions: number
  totalDisbursed: number
  totalRepaid: number
  interestEarned: number
  loanBookOutstanding: number
  cashOnHand: number
  projectedPool: number
}

/**
 * Aggregates the shared pool.
 *
 * - `cashOnHand` is the money actually in the pool right now.
 * - `loanBookOutstanding` is what borrowers owe today (principal + interest to date).
 * - `projectedPool` is cash on hand plus still-expected contributions plus every
 *   loan balance projected to its due date (i.e. the pool once all targets are
 *   met and all loans settle).
 *
 * `year` scopes targets/contributions only; loans and repayments are all-time.
 */
export function summarizePool(
  targets: Target[],
  contributions: Contribution[],
  loans: Loan[],
  repayments: Repayment[],
  asOf: string,
  year?: number,
): PoolSummary {
  const expected = totalExpected(targets, year)
  const contributed = totalContributed(contributions, year)
  const disbursed = sum(loans.map((loan) => loan.principal))
  const repaid = sum(repayments.map((repayment) => repayment.amount))

  let interestEarned = 0
  let loanBookOutstanding = 0
  let projectedOutstanding = 0

  for (const loan of loans) {
    const live = loanBalanceAt(loan, repayments, asOf)
    interestEarned = round2(interestEarned + live.interestPaid)
    loanBookOutstanding = round2(loanBookOutstanding + live.totalOutstanding)

    const projectionDate = maxIso(loan.dueDate, asOf)
    projectedOutstanding = round2(
      projectedOutstanding + loanBalanceAt(loan, repayments, projectionDate).totalOutstanding,
    )
  }

  const outstandingContributions = round2(expected - contributed)
  const cashOnHand = round2(contributed - disbursed + repaid)

  return {
    totalExpected: expected,
    totalContributed: contributed,
    outstandingContributions,
    totalDisbursed: disbursed,
    totalRepaid: repaid,
    interestEarned,
    loanBookOutstanding,
    cashOnHand,
    projectedPool: round2(cashOnHand + outstandingContributions + projectedOutstanding),
  }
}
