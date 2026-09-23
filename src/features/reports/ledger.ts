import {
  compareIso,
  contributionsInRange,
  isWithinRange,
  loanBalanceAt,
  round2,
  sum,
  targetYearForRange,
  type DateRange,
} from '@/lib/calc'
import type { Contribution, Loan, Repayment, Target, UserProfile } from '@/lib/types'

/**
 * Transaction logs for the reports.
 *
 * The reports used to show one row per member and one row per loan, where a new
 * payment merely moved the figures inside an existing row. These build the other
 * shape: one row per event, so a contribution or a repayment appears as its own
 * entry and the period filter reads as a ledger.
 */

/** The `yyyy-mm-dd` a record was entered on, or '' when it predates the field. */
function enteredOn(createdAt: string): string {
  return createdAt.slice(0, 10)
}

export interface ContributionLogRow {
  id: string
  date: string
  /** When the payment was recorded, which differs from `date` when backdated. */
  enteredAt: string
  name: string
  amount: number
  /**
   * The member's yearly target minus everything they had paid up to and
   * including this payment, or null when they have no target that year.
   */
  leftAfter: number | null
  note: string
}

export interface ContributionLog {
  rows: ContributionLogRow[]
  total: number
  count: number
  /** The year the targets are read from: the one the period starts in. */
  targetYear: number
}

/**
 * One row per contribution in the period, newest first.
 *
 * `leftAfter` is a running figure, like the repayment log's balance column: it
 * replays the member's whole target year, not just the period, so a payment
 * outside the visible range still shapes the total a later row is measured
 * against. Contributions are matched to a year on their `date`, not the stored
 * `year` field, which is what the period filter uses too.
 */
export function contributionLog(
  contributions: Contribution[],
  users: UserProfile[],
  targets: Target[],
  range: DateRange,
): ContributionLog {
  const nameById = new Map(users.map((user) => [user.uid, user.name || user.phone]))
  const targetYear = targetYearForRange(range)

  const targetById = new Map(
    targets
      .filter((target) => target.year === targetYear)
      .map((target) => [target.userId, target.amount]),
  )

  // Replay the whole target year in payment order, so each row can be shown
  // against the target minus everything paid up to that point.
  const paidSoFar = new Map<string, number>()
  const leftById = new Map<string, number>()
  const inTargetYear = contributions
    .filter((entry) => entry.date.slice(0, 4) === String(targetYear))
    .sort((a, b) => compareIso(a.date, b.date) || compareIso(a.createdAt, b.createdAt))

  for (const entry of inTargetYear) {
    const running = round2((paidSoFar.get(entry.userId) ?? 0) + entry.amount)
    paidSoFar.set(entry.userId, running)

    const target = targetById.get(entry.userId)
    if (target !== undefined) leftById.set(entry.id, round2(target - running))
  }

  // `contributionsInRange` already scopes on the actual `date` and sorts newest
  // first, so the log agrees with the period filter the rest of the page uses.
  const rows = contributionsInRange(contributions, range, 'newest').map(
    (entry): ContributionLogRow => ({
      id: entry.id,
      date: entry.date,
      enteredAt: enteredOn(entry.createdAt),
      name: nameById.get(entry.userId) ?? entry.userId,
      amount: entry.amount,
      leftAfter: leftById.get(entry.id) ?? null,
      note: entry.note,
    }),
  )

  return {
    rows,
    total: round2(sum(rows.map((row) => row.amount))),
    count: rows.length,
    targetYear,
  }
}

export interface RepaymentLogRow {
  id: string
  date: string
  /** When the repayment was recorded, which differs from `date` when backdated. */
  enteredAt: string
  borrower: string
  amount: number
  /** Interest and principal split, or null when the repayment has no loan. */
  interestPortion: number | null
  principalPortion: number | null
  /** The loan's outstanding total straight after this payment, or null. */
  balanceAfter: number | null
}

export interface RepaymentLog {
  rows: RepaymentLogRow[]
  repaid: number
  interest: number
  principal: number
  count: number
}

/**
 * One row per repayment inside the period.
 *
 * The interest/principal split comes from replaying each loan's full history, so
 * it is the same interest-first allocation the loan book shows — a repayment
 * outside the period still affects the balance a later one lands on. `asOf` must
 * be at or after the period end, or the split would be computed mid-history.
 */
export function repaymentLog(
  loans: Loan[],
  repayments: Repayment[],
  range: DateRange | undefined,
  asOf: string,
): RepaymentLog {
  const loanById = new Map(loans.map((loan) => [loan.id, loan]))

  const allocationById = new Map(
    loans.flatMap((loan) =>
      loanBalanceAt(loan, repayments, asOf).allocations.map(
        (allocation) => [allocation.repaymentId, allocation] as const,
      ),
    ),
  )

  const rows = repayments
    .filter((repayment) => (range ? isWithinRange(repayment.date, range) : true))
    .sort((a, b) => compareIso(b.date, a.date) || compareIso(b.createdAt, a.createdAt))
    .map((repayment): RepaymentLogRow => {
      const allocation = allocationById.get(repayment.id)
      return {
        id: repayment.id,
        date: repayment.date,
        enteredAt: enteredOn(repayment.createdAt),
        borrower: loanById.get(repayment.loanId)?.borrowerName ?? '',
        amount: repayment.amount,
        interestPortion: allocation ? allocation.interestPortion : null,
        principalPortion: allocation ? allocation.principalPortion : null,
        balanceAfter: allocation ? allocation.balanceAfter : null,
      }
    })

  return {
    rows,
    repaid: round2(sum(rows.map((row) => row.amount))),
    interest: round2(sum(rows.map((row) => row.interestPortion ?? 0))),
    principal: round2(sum(rows.map((row) => row.principalPortion ?? 0))),
    count: rows.length,
  }
}
