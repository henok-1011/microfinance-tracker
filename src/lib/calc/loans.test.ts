import { describe, expect, it } from 'vitest'

import { accrueInterest, loanBalanceAt, loansWithBalance } from '@/lib/calc/loans'
import type { Loan, Repayment } from '@/lib/types'

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'L1',
    borrowerName: 'Borrower',
    borrowerPhone: '',
    principal: 1000,
    monthlyRatePct: 1,
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
  it('charges the monthly rate once per month elapsed', () => {
    expect(accrueInterest(1000, 5, 2)).toBe(100)
    expect(accrueInterest(200000, 5, 5)).toBe(50000)
  })

  it('returns zero for a zero principal, rate, or term', () => {
    expect(accrueInterest(1000, 0, 30)).toBe(0)
    expect(accrueInterest(0, 5, 30)).toBe(0)
    expect(accrueInterest(1000, 5, 0)).toBe(0)
  })

  it('rounds to two decimals', () => {
    expect(accrueInterest(1000, 1, 10 / 30)).toBe(3.33)
  })
})

describe('loanBalanceAt', () => {
  it('accrues one month of interest per month elapsed', () => {
    const balance = loanBalanceAt(loan(), [], '2026-02-01')
    expect(balance.principalOutstanding).toBe(1000)
    expect(balance.interestOutstanding).toBe(10)
    expect(balance.totalOutstanding).toBe(1010)
    expect(balance.isPaid).toBe(false)
  })

  it('matches the flat monthly rate a lender quotes for the term', () => {
    // 200,000 at 5% a month for five months is 50,000 of interest.
    const balance = loanBalanceAt(
      loan({
        principal: 200000,
        monthlyRatePct: 5,
        startDate: '2026-01-01',
        dueDate: '2026-06-01',
      }),
      [],
      '2026-06-01',
    )
    expect(balance.interestOutstanding).toBe(50000)
    expect(balance.totalOutstanding).toBe(250000)
  })

  it('prorates the leftover days of a partial month', () => {
    // Ten days past the anniversary is a third of a month, not a whole one.
    expect(loanBalanceAt(loan(), [], '2026-01-11').interestOutstanding).toBe(3.33)
    expect(loanBalanceAt(loan(), [], '2026-02-11').interestOutstanding).toBe(13.33)
  })

  it('applies a partial repayment interest-first, then principal', () => {
    const balance = loanBalanceAt(loan(), [repayment('2026-02-01', 500)], '2026-02-01')
    expect(balance.allocations).toHaveLength(1)
    expect(balance.allocations[0]).toMatchObject({
      interestPortion: 10,
      principalPortion: 490,
      balanceAfter: 510,
    })
    expect(balance.principalOutstanding).toBe(510)
    expect(balance.interestOutstanding).toBe(0)
    expect(balance.totalOutstanding).toBe(510)
  })

  it('keeps accruing on the reduced principal', () => {
    const repayments = [repayment('2026-02-01', 500)]
    const balance = loanBalanceAt(loan(), repayments, '2026-04-01')
    expect(balance.interestOutstanding).toBe(10.2)
    expect(balance.totalOutstanding).toBe(520.2)
  })

  it('marks a loan paid when principal and interest reach zero', () => {
    const balance = loanBalanceAt(loan(), [repayment('2026-02-01', 1010)], '2026-02-01')
    expect(balance.totalOutstanding).toBe(0)
    expect(balance.isPaid).toBe(true)
    expect(balance.interestPaid).toBe(10)
    expect(balance.principalPaid).toBe(1000)
    expect(balance.totalPaid).toBe(1010)
  })

  it('stops accruing at the due date, however late the loan is viewed', () => {
    const due = loan({ dueDate: '2026-03-01' })
    const atDue = loanBalanceAt(due, [], '2026-03-01')
    const monthsLater = loanBalanceAt(due, [], '2026-12-31')

    expect(atDue.interestOutstanding).toBe(20)
    expect(monthsLater.interestOutstanding).toBe(20)
    expect(monthsLater.totalOutstanding).toBe(atDue.totalOutstanding)
  })

  it('charges nothing for the time an overdue repayment spends past the due date', () => {
    const due = loan({ dueDate: '2026-03-01' })
    // Two months of interest, then a payment three months after the term ended.
    const balance = loanBalanceAt(due, [repayment('2026-06-01', 500)], '2026-06-01')
    expect(balance.interestPaid).toBe(20)
    expect(balance.interestOutstanding).toBe(0)
    expect(balance.principalPaid).toBe(480)
    // 1000 of principal + 20 of interest - the 500 paid.
    expect(balance.totalOutstanding).toBe(520)
  })

  it('accrues nothing when the rate is zero', () => {
    const balance = loanBalanceAt(
      loan({ monthlyRatePct: 0 }),
      [repayment('2026-02-01', 400)],
      '2026-02-01',
    )
    expect(balance.interestAccrued).toBe(0)
    expect(balance.totalOutstanding).toBe(600)
  })

  it('clamps overpayment and ignores the excess', () => {
    const balance = loanBalanceAt(
      loan({ monthlyRatePct: 0 }),
      [repayment('2026-02-01', 1500)],
      '2026-02-01',
    )
    expect(balance.principalOutstanding).toBe(0)
    expect(balance.totalOutstanding).toBe(0)
    expect(balance.isPaid).toBe(true)
  })

  it('processes repayments in date order regardless of input order', () => {
    const balance = loanBalanceAt(
      loan({ monthlyRatePct: 0 }),
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
      loan({ monthlyRatePct: 0 }),
      [repayment('2026-02-01', 500, 'L2')],
      '2026-02-01',
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
  const settled = loan({ id: 'L2', dueDate: '2026-06-30', principal: 100, monthlyRatePct: 0 })
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
