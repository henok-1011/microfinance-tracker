import { describe, expect, it } from 'vitest'

import { loanBalanceAt, round2, yearRange } from '@/lib/calc'
import { summarizePool } from '@/lib/calc/pool'
import type { Contribution, Loan, Repayment, Target } from '@/lib/types'

function target(userId: string, year: number, amount: number): Target {
  return { id: `${userId}_${year}`, userId, year, amount }
}

function contribution(userId: string, year: number, amount: number): Contribution {
  return {
    id: `${userId}_${year}_${amount}`,
    userId,
    year,
    amount,
    date: `${year}-01-01`,
    note: '',
    recordedBy: 'admin',
    createdAt: `${year}-01-01T00:00:00.000Z`,
  }
}

const loan: Loan = {
  id: 'L1',
  borrowerName: 'Borrower',
  borrowerPhone: '',
  principal: 2000,
  monthlyRatePct: 1,
  startDate: '2026-01-01',
  dueDate: '2026-12-31',
  status: 'active',
  createdBy: 'admin',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const repayment: Repayment = {
  id: 'R1',
  loanId: 'L1',
  amount: 1000,
  date: '2026-01-01',
  recordedBy: 'admin',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const targets = [target('u1', 2026, 12000), target('u2', 2026, 6000), target('u1', 2025, 10000)]
const contributions = [
  contribution('u1', 2026, 5000),
  contribution('u2', 2026, 6000),
  contribution('u1', 2025, 10000),
]

describe('summarizePool', () => {
  it('aggregates a range-scoped pool', () => {
    const pool = summarizePool(
      targets,
      contributions,
      [loan],
      [repayment],
      '2026-01-01',
      yearRange(2026),
    )
    expect(pool).toEqual({
      totalExpected: 18000,
      totalContributed: 11000,
      outstandingContributions: 7000,
      totalDisbursed: 2000,
      totalRepaid: 1000,
      interestEarned: 0,
      loanBookOutstanding: 1000,
      cashOnHand: 10000,
      // 1000 left on the book at 1% a month for the 12-month term.
      projectedPool: 18120,
    })
  })

  it('aggregates all-time when no range is given', () => {
    const pool = summarizePool(targets, contributions, [loan], [repayment], '2026-01-01')
    expect(pool.totalExpected).toBe(28000)
    expect(pool.totalContributed).toBe(21000)
    expect(pool.outstandingContributions).toBe(7000)
    expect(pool.cashOnHand).toBe(20000)
    expect(pool.projectedPool).toBe(28120)
  })

  it('recognises interest already earned', () => {
    const lateRepayment: Repayment = { ...repayment, date: '2026-01-31', amount: 1500 }
    const pool = summarizePool([], [], [loan], [lateRepayment], '2026-01-31')
    expect(pool.interestEarned).toBeGreaterThan(0)
  })

  it('drops fully repaid loans from the projected pool', () => {
    // Principal plus the 20 of interest accrued for January.
    const payoff: Repayment = { ...repayment, date: '2026-01-31', amount: 2020 }
    const pool = summarizePool([], [], [loan], [payoff], '2026-02-01')
    expect(pool.loanBookOutstanding).toBe(0)
    expect(pool.projectedPool).toBe(pool.cashOnHand)
  })

  it('handles an empty pool', () => {
    const pool = summarizePool([], [], [], [], '2026-01-01', yearRange(2026))
    expect(pool.cashOnHand).toBe(0)
    expect(pool.projectedPool).toBe(0)
  })

  it('freezes an overdue loan at its due date', () => {
    // Interest stops at the due date, so viewing the pool a year later cannot
    // inflate the debt, and the projection cannot exceed the agreed total.
    const atDue = loanBalanceAt(loan, [], loan.dueDate).totalOutstanding
    const overdue = summarizePool([], [], [loan], [], '2027-06-30')
    expect(overdue.loanBookOutstanding).toBe(atDue)
    expect(overdue.projectedPool).toBe(round2(overdue.cashOnHand + overdue.loanBookOutstanding))
  })

  it('scopes contributions by their date, not the stored year field', () => {
    // Dated outside the range, so it must not inflate the period's pool.
    const backdated = { ...contributions[0], id: 'backdated', date: '2025-12-31' }
    const pool = summarizePool(targets, [backdated], [], [], '2026-01-01', yearRange(2026))
    expect(pool.totalContributed).toBe(0)
    expect(pool.cashOnHand).toBe(0)
    expect(pool.outstandingContributions).toBe(18000)
  })

  it('projects an unsettled loan forward to its due date', () => {
    const pool = summarizePool([], [], [loan], [], '2026-01-01')
    // Nothing has accrued yet, so today's book is the bare principal.
    expect(pool.loanBookOutstanding).toBe(2000)
    expect(pool.cashOnHand).toBe(-2000)
    expect(pool.projectedPool).toBe(
      round2(pool.cashOnHand + loanBalanceAt(loan, [], loan.dueDate).totalOutstanding),
    )
  })
})
