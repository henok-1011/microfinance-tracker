import { describe, expect, it } from 'vitest'

import { accrueInterest, loanBalanceAt, loansWithBalance } from '@/lib/calc/loans'
import type { Loan, Repayment } from '@/lib/types'

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'L1',
    borrowerName: 'Borrower',
    borrowerPhone: '',
    principal: 1000,
    annualRatePct: 12,
    startDate: '2026-01-01',
    dueDate: '2026-12-31',
    status: 'active',
    createdBy: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function repayment(date: string, amount: number, loanId = 'L1'): Repayment {
  return {
    id: `${loanId}_${date}_${amount}`,
    loanId,
    amount,
    date,
    recordedBy: 'admin',
    createdAt: `${date}T00:00:00.000Z`,
  }
}

describe('accrueInterest', () => {
  it('computes simple interest on principal for a day count', () => {
    expect(accrueInterest(1000, 12, 30)).toBe(9.86)
    expect(accrueInterest(1000, 0, 30)).toBe(0)
    expect(accrueInterest(0, 12, 30)).toBe(0)
    expect(accrueInterest(1000, 12, 0)).toBe(0)
  })
})

describe('loanBalanceAt', () => {
  it('accrues interest with no repayments', () => {
    const balance = loanBalanceAt(loan(), [], '2026-01-31')
    expect(balance.principalOutstanding).toBe(1000)
    expect(balance.interestOutstanding).toBe(9.86)
    expect(balance.totalOutstanding).toBe(1009.86)
    expect(balance.isPaid).toBe(false)
  })

  it('applies a partial repayment interest-first, then principal', () => {
    const balance = loanBalanceAt(loan(), [repayment('2026-01-31', 500)], '2026-01-31')
    expect(balance.allocations).toHaveLength(1)
    expect(balance.allocations[0]).toMatchObject({
      interestPortion: 9.86,
      principalPortion: 490.14,
      balanceAfter: 509.86,
    })
    expect(balance.principalOutstanding).toBe(509.86)
    expect(balance.interestOutstanding).toBe(0)
    expect(balance.totalOutstanding).toBe(509.86)
  })

  it('keeps accruing on the reduced principal', () => {
    const repayments = [repayment('2026-01-31', 500)]
    const balance = loanBalanceAt(loan(), repayments, '2026-03-02')
    expect(balance.interestOutstanding).toBe(5.03)
    expect(balance.totalOutstanding).toBe(514.89)
  })

  it('marks a loan paid when principal and interest reach zero', () => {
    const balance = loanBalanceAt(loan(), [repayment('2026-01-31', 1009.86)], '2026-01-31')
    expect(balance.totalOutstanding).toBe(0)
    expect(balance.isPaid).toBe(true)
    expect(balance.interestPaid).toBe(9.86)
    expect(balance.principalPaid).toBe(1000)
    expect(balance.totalPaid).toBe(1009.86)
  })

  it('accrues nothing when the rate is zero', () => {
    const balance = loanBalanceAt(
      loan({ annualRatePct: 0 }),
      [repayment('2026-01-31', 400)],
      '2026-01-31',
    )
    expect(balance.interestAccrued).toBe(0)
    expect(balance.totalOutstanding).toBe(600)
  })

  it('clamps overpayment and ignores the excess', () => {
    const balance = loanBalanceAt(
      loan({ annualRatePct: 0 }),
      [repayment('2026-01-31', 1500)],
      '2026-01-31',
    )
    expect(balance.principalOutstanding).toBe(0)
    expect(balance.totalOutstanding).toBe(0)
    expect(balance.isPaid).toBe(true)
  })

  it('processes repayments in date order regardless of input order', () => {
    const balance = loanBalanceAt(
      loan({ annualRatePct: 0 }),
      [repayment('2026-02-15', 100), repayment('2026-01-31', 100)],
      '2026-02-15',
    )
    expect(balance.allocations.map((allocation) => allocation.date)).toEqual([
      '2026-01-31',
      '2026-02-15',
    ])
    expect(balance.principalOutstanding).toBe(800)
  })

  it('ignores repayments for other loans', () => {
    const balance = loanBalanceAt(
      loan({ annualRatePct: 0 }),
      [repayment('2026-01-31', 500, 'L2')],
      '2026-01-31',
    )
    expect(balance.principalOutstanding).toBe(1000)
  })

  it('charges no interest on a same-day repayment', () => {
    const balance = loanBalanceAt(loan(), [repayment('2026-01-01', 200)], '2026-01-01')
    expect(balance.interestAccrued).toBe(0)
    expect(balance.principalOutstanding).toBe(800)
  })

  it('does not accrue before the start date', () => {
    const balance = loanBalanceAt(loan(), [], '2025-12-01')
    expect(balance.totalOutstanding).toBe(1000)
  })
})

describe('loansWithBalance', () => {
  const settled = loan({ id: 'L2', dueDate: '2026-06-30', principal: 100, annualRatePct: 0 })
  const late = loan({ id: 'L3', dueDate: '2026-12-31' })
  const early = loan({ id: 'L4', dueDate: '2026-03-31' })
  const settleAll = repayment('2026-01-31', 100, 'L2')

  it('lists unsettled loans first, then by due date', () => {
    const result = loansWithBalance([settled, late, early], [settleAll], '2026-02-01')
    expect(result.map((entry) => entry.loan.id)).toEqual(['L4', 'L3', 'L2'])
    expect(result[2].balance.isPaid).toBe(true)
  })

  it('attaches each loan its own balance', () => {
    const result = loansWithBalance([settled, early], [], '2026-01-31')
    expect(result[0].loan.id).toBe('L4')
    expect(result[0].balance.principalOutstanding).toBe(1000)
    expect(result[1].loan.id).toBe('L2')
    expect(result[1].balance.totalOutstanding).toBe(100)
  })

  it('does not mutate the input array', () => {
    const input = [late, early]
    loansWithBalance(input, [], '2026-01-31')
    expect(input.map((entry) => entry.id)).toEqual(['L3', 'L4'])
  })
})
