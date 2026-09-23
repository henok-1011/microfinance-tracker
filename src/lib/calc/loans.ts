import type { Loan, Repayment } from '@/lib/types'

import { compareIso, minIso, monthsBetween } from './date'
import { round2 } from './money'

const PAID_EPSILON = 0.005

/**
 * Simple interest for a single accrual segment, charged per month of the term.
 * Interest accrues on the outstanding principal only; there is no compounding.
 */
export function accrueInterest(principal: number, monthlyRatePct: number, months: number): number {
  if (principal <= 0 || monthlyRatePct <= 0 || months <= 0) return 0
  return round2(principal * (monthlyRatePct / 100) * months)
}

export interface RepaymentAllocation {
  repaymentId: string
  date: string
  amount: number
  interestPortion: number
  principalPortion: number
  balanceAfter: number
}

export interface LoanBalance {
  principalOutstanding: number
  interestOutstanding: number
  totalOutstanding: number
  interestAccrued: number
  interestPaid: number
  principalPaid: number
  totalPaid: number
  isPaid: boolean
  allocations: RepaymentAllocation[]
}

/**
 * Replays a loan's repayments in date order, accruing simple interest on the
 * outstanding principal between events. The rate is charged per calendar month,
 * with leftover days prorated. Payments are applied interest-first, then to
 * principal. Interest stops at the due date, so an overdue loan never grows
 * past the term it was agreed on; it accrues up to `asOf` for a live balance.
 */
export function loanBalanceAt(loan: Loan, repayments: Repayment[], asOf: string): LoanBalance {
  const cutoff = asOf.slice(0, 10)
  const interestStop = loan.dueDate.slice(0, 10)
  const events = repayments
    .filter((entry) => entry.loanId === loan.id && entry.date.slice(0, 10) <= cutoff)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  let principal = round2(loan.principal)
  let interest = 0
  let lastDate = loan.startDate
  let interestPaid = 0
  let principalPaid = 0
  const allocations: RepaymentAllocation[] = []

  for (const repayment of events) {
    interest = round2(
      interest +
        accrueInterest(
          principal,
          loan.monthlyRatePct,
          monthsBetween(lastDate, minIso(repayment.date, interestStop)),
        ),
    )

    const payment = Math.max(0, repayment.amount)
    const interestPortion = Math.min(payment, interest)
    const principalPortion = Math.min(round2(payment - interestPortion), principal)

    interest = round2(interest - interestPortion)
    principal = round2(principal - principalPortion)
    interestPaid = round2(interestPaid + interestPortion)
    principalPaid = round2(principalPaid + principalPortion)
    lastDate = repayment.date

    allocations.push({
      repaymentId: repayment.id,
      date: repayment.date,
      amount: payment,
      interestPortion,
      principalPortion,
      balanceAfter: round2(principal + interest),
    })
  }

  interest = round2(
    interest +
      accrueInterest(
        principal,
        loan.monthlyRatePct,
        monthsBetween(lastDate, minIso(asOf, interestStop)),
      ),
  )

  const totalOutstanding = round2(principal + interest)
  return {
    principalOutstanding: principal,
    interestOutstanding: interest,
    totalOutstanding,
    interestAccrued: round2(interestPaid + interest),
    interestPaid,
    principalPaid,
    totalPaid: round2(interestPaid + principalPaid),
    isPaid: totalOutstanding <= PAID_EPSILON,
    allocations,
  }
}

export interface LoanWithBalance {
  loan: Loan
  balance: LoanBalance
}

/**
 * Pairs each loan with its live balance, unsettled loans first, then by due
 * date. Always returns a new array so callers can sort state safely.
 */
export function loansWithBalance(
  loans: Loan[],
  repayments: Repayment[],
  asOf: string,
): LoanWithBalance[] {
  return loans
    .map((loan) => ({ loan, balance: loanBalanceAt(loan, repayments, asOf) }))
    .sort(
      (a, b) =>
        Number(a.balance.isPaid) - Number(b.balance.isPaid) ||
        compareIso(a.loan.dueDate, b.loan.dueDate) ||
        compareIso(a.loan.startDate, b.loan.startDate) ||
        a.loan.id.localeCompare(b.loan.id),
    )
}
