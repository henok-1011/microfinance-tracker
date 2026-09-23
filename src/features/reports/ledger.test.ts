import { describe, expect, it } from 'vitest'

import { contributionLog, repaymentLog } from '@/features/reports/ledger'
import type { Contribution, Loan, Repayment, Target, UserProfile } from '@/lib/types'

function user(uid: string, name: string): UserProfile {
  return {
    uid,
    name,
    phone: '0911223344',
    role: 'user',
    expectedYearly: 0,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function target(userId: string, year: number, amount: number): Target {
  return { id: `${userId}_${year}`, userId, year, amount }
}

/** `enteredAt` defaults to the payment date; pass it to model a backdated entry. */
function contribution(
  id: string,
  userId: string,
  date: string,
  amount: number,
  enteredAt = date,
): Contribution {
  return {
    id,
    userId,
    year: Number(date.slice(0, 4)),
    amount,
    date,
    note: '',
    recordedBy: 'admin',
    createdAt: `${enteredAt}T09:30:00.000Z`,
  }
}

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'L1',
    borrowerName: 'Obsa',
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

function repayment(id: string, date: string, amount: number, loanId = 'L1'): Repayment {
  return {
    id,
    loanId,
    amount,
    date,
    recordedBy: 'admin',
    createdAt: `${date}T00:00:00.000Z`,
  }
}

const USERS = [user('u1', 'Almaz'), user('u2', '')]
const TARGETS = [target('u1', 2026, 1000)]
const YEAR_2026 = { from: '2026-01-01', to: '2026-12-31' }

const CONTRIBUTIONS = [
  contribution('c1', 'u1', '2026-02-10', 500),
  contribution('c2', 'u1', '2026-05-20', 700),
  contribution('c3', 'u2', '2026-06-01', 300),
]

describe('contributionLog', () => {
  it('lists one row per payment in the period, newest first', () => {
    const log = contributionLog(CONTRIBUTIONS, USERS, TARGETS, YEAR_2026)
    expect(log.rows.map((row) => row.id)).toEqual(['c3', 'c2', 'c1'])
    expect(log.count).toBe(3)
    expect(log.total).toBe(1500)
    expect(log.targetYear).toBe(2026)
  })

  it('scopes to the period on the payment date', () => {
    const log = contributionLog(CONTRIBUTIONS, USERS, TARGETS, {
      from: '2026-03-01',
      to: '2026-06-30',
    })
    expect(log.rows.map((row) => row.id)).toEqual(['c3', 'c2'])
    expect(log.total).toBe(1000)
  })

  it('resolves the member name, falling back to the phone number', () => {
    const log = contributionLog(CONTRIBUTIONS, USERS, TARGETS, YEAR_2026)
    expect(log.rows.find((row) => row.id === 'c3')?.name).toBe('0911223344')
    expect(log.rows.find((row) => row.id === 'c1')?.name).toBe('Almaz')
  })

  it('falls back to the id for an unknown member', () => {
    const orphan = contribution('c9', 'ghost', '2026-02-01', 100)
    const log = contributionLog([orphan], USERS, TARGETS, YEAR_2026)
    expect(log.rows[0].name).toBe('ghost')
  })

  it('records the date the payment was entered', () => {
    const log = contributionLog(CONTRIBUTIONS, USERS, TARGETS, YEAR_2026)
    expect(log.rows.find((row) => row.id === 'c1')?.enteredAt).toBe('2026-02-10')
  })

  it('shows a backdated payment under its entry date', () => {
    const backdated = contribution('c4', 'u1', '2026-01-05', 200, '2026-09-23')
    const log = contributionLog([backdated], USERS, TARGETS, YEAR_2026)
    expect(log.rows[0].date).toBe('2026-01-05')
    expect(log.rows[0].enteredAt).toBe('2026-09-23')
  })

  it('measures the yearly remainder after each payment', () => {
    const log = contributionLog(CONTRIBUTIONS, USERS, TARGETS, YEAR_2026)
    // 1000 target: 500 paid leaves 500, then another 700 overpays to -200.
    expect(log.rows.find((row) => row.id === 'c1')?.leftAfter).toBe(500)
    expect(log.rows.find((row) => row.id === 'c2')?.leftAfter).toBe(-200)
  })

  it('replays payments outside the period, so the remainder stays truthful', () => {
    // February is not in this period, but its 500 still counts towards May's row.
    const may = contributionLog(CONTRIBUTIONS, USERS, TARGETS, {
      from: '2026-05-01',
      to: '2026-05-31',
    })
    expect(may.rows.map((row) => row.id)).toEqual(['c2'])
    expect(may.rows[0].leftAfter).toBe(-200)
  })

  it('leaves the remainder empty for a member with no target that year', () => {
    const log = contributionLog(CONTRIBUTIONS, USERS, TARGETS, YEAR_2026)
    expect(log.rows.find((row) => row.id === 'c3')?.leftAfter).toBeNull()
  })

  it('ignores payments from other years when measuring the remainder', () => {
    const withNextYear = [...CONTRIBUTIONS, contribution('c5', 'u1', '2027-01-05', 900)]
    const log = contributionLog(withNextYear, USERS, TARGETS, YEAR_2026)
    expect(log.rows.find((row) => row.id === 'c2')?.leftAfter).toBe(-200)

    // A 2027 period reads 2027 targets, which u1 does not have.
    const nextYear = contributionLog(withNextYear, USERS, TARGETS, {
      from: '2027-01-01',
      to: '2027-12-31',
    })
    expect(nextYear.rows.map((row) => row.id)).toEqual(['c5'])
    expect(nextYear.rows[0].leftAfter).toBeNull()
  })

  it('returns nothing for a period with no payments', () => {
    const log = contributionLog(CONTRIBUTIONS, USERS, TARGETS, {
      from: '2025-01-01',
      to: '2025-12-31',
    })
    expect(log.rows).toEqual([])
    expect(log.total).toBe(0)
    expect(log.count).toBe(0)
  })
})

describe('repaymentLog', () => {
  const loans = [loan()]
  const repayments = [repayment('r1', '2026-02-01', 500), repayment('r2', '2026-03-01', 100)]

  it('lists one row per payment in the period, newest first', () => {
    const log = repaymentLog(loans, repayments, YEAR_2026, '2026-12-31')
    expect(log.rows.map((row) => row.id)).toEqual(['r2', 'r1'])
    expect(log.count).toBe(2)
    expect(log.repaid).toBe(600)
  })

  it('splits each payment interest-first, exactly as the loan book does', () => {
    const log = repaymentLog(loans, repayments, YEAR_2026, '2026-12-31')
    const first = log.rows.find((row) => row.id === 'r1')
    // One month at 1% on 1000 is 10 of interest, then 490 off the principal.
    expect(first).toMatchObject({
      interestPortion: 10,
      principalPortion: 490,
      balanceAfter: 510,
    })
    expect(log.interest).toBe(15.1)
    expect(log.principal).toBe(584.9)
  })

  it('records the date the repayment was entered', () => {
    const backdated: Repayment = {
      ...repayment('r3', '2026-02-01', 100),
      createdAt: '2026-09-23T14:05:00.000Z',
    }
    const log = repaymentLog(loans, [backdated], YEAR_2026, '2026-12-31')
    expect(log.rows[0].date).toBe('2026-02-01')
    expect(log.rows[0].enteredAt).toBe('2026-09-23')
  })

  it('replays payments outside the period, since they change the balance', () => {
    // March's interest is charged on the principal February reduced.
    const march = repaymentLog(
      loans,
      repayments,
      { from: '2026-03-01', to: '2026-03-31' },
      '2026-12-31',
    )
    expect(march.rows.map((row) => row.id)).toEqual(['r2'])
    expect(march.rows[0].interestPortion).toBe(5.1)
    expect(march.rows[0].balanceAfter).toBe(415.1)
    expect(march.repaid).toBe(100)
  })

  it('reports a payment with no matching loan without inventing a split', () => {
    const orphan = repayment('r9', '2026-02-01', 250, 'gone')
    const log = repaymentLog(loans, [orphan], YEAR_2026, '2026-12-31')
    expect(log.rows[0]).toMatchObject({
      borrower: '',
      interestPortion: null,
      principalPortion: null,
      balanceAfter: null,
    })
    // Still counted in what was collected.
    expect(log.repaid).toBe(250)
    expect(log.interest).toBe(0)
  })

  it('does not mutate the repayments it was given', () => {
    const input = [repayment('r1', '2026-03-01', 100), repayment('r2', '2026-02-01', 100)]
    repaymentLog(loans, input, undefined, '2026-12-31')
    expect(input.map((entry) => entry.id)).toEqual(['r1', 'r2'])
  })

  it('returns nothing for an empty period', () => {
    const log = repaymentLog(
      loans,
      repayments,
      { from: '2027-01-01', to: '2027-12-31' },
      '2027-12-31',
    )
    expect(log.rows).toEqual([])
    expect(log.repaid).toBe(0)
  })
})
