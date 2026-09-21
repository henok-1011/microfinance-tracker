import { describe, expect, it } from 'vitest'

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
  annualRatePct: 12,
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
  it('aggregates a year-scoped pool', () => {
    const pool = summarizePool(targets, contributions, [loan], [repayment], '2026-01-01', 2026)
    expect(pool).toEqual({
      totalExpected: 18000,
      totalContributed: 11000,
      outstandingContributions: 7000,
      totalDisbursed: 2000,
      totalRepaid: 1000,
      interestEarned: 0,
      loanBookOutstanding: 1000,
      cashOnHand: 10000,
      projectedPool: 18119.67,
    })
  })

  it('aggregates all-time when no year is given', () => {
    const pool = summarizePool(targets, contributions, [loan], [repayment], '2026-01-01')
    expect(pool.totalExpected).toBe(28000)
    expect(pool.totalContributed).toBe(21000)
    expect(pool.outstandingContributions).toBe(7000)
    expect(pool.cashOnHand).toBe(20000)
    expect(pool.projectedPool).toBe(28119.67)
  })

  it('recognises interest already earned', () => {
    const lateRepayment: Repayment = { ...repayment, date: '2026-01-31', amount: 1500 }
    const pool = summarizePool([], [], [loan], [lateRepayment], '2026-01-31')
    expect(pool.interestEarned).toBeGreaterThan(0)
  })

  it('drops fully repaid loans from the projected pool', () => {
    const payoff: Repayment = { ...repayment, date: '2026-01-31', amount: 2019.73 }
    const pool = summarizePool([], [], [loan], [payoff], '2026-02-01')
    expect(pool.loanBookOutstanding).toBe(0)
    expect(pool.projectedPool).toBe(pool.cashOnHand)
  })

  it('handles an empty pool', () => {
    const pool = summarizePool([], [], [], [], '2026-01-01', 2026)
    expect(pool.cashOnHand).toBe(0)
    expect(pool.projectedPool).toBe(0)
  })
})
