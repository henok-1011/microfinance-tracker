import type { Loan, Repayment } from '@/lib/types'

import { daysBetween } from './date'
import { round2 } from './money'

const DAYS_PER_YEAR = 365
const PAID_EPSILON = 0.005

/**
 * Simple interest for a single accrual segment. Interest accrues on the
 * outstanding principal only; there is no compounding.
 */
export function accrueInterest(principal: number, annualRatePct: number, days: number): number {
  if (principal <= 0 || annualRatePct <= 0 || days <= 0) return 0
  return round2((principal * (annualRatePct / 100) * days) / DAYS_PER_YEAR)
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
 * outstanding principal between events. Payments are applied interest-first,
 * then to principal. Interest accrues up to `asOf` for a live balance.
 */
export function loanBalanceAt(loan: Loan, repayments: Repayment[], asOf: string): LoanBalance {
  const cutoff = asOf.slice(0, 10)
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
        accrueInterest(principal, loan.annualRatePct, daysBetween(lastDate, repayment.date)),
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
    interest + accrueInterest(principal, loan.annualRatePct, daysBetween(lastDate, asOf)),
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
