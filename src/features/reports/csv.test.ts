import { describe, expect, it } from 'vitest'

import {
  contributionsLogCsvRows,
  repaymentsLogCsvRows,
  type ContributionLogCsvLabels,
  type RepaymentLogCsvLabels,
} from '@/features/reports/csv'
import type { ContributionLogRow, RepaymentLogRow } from '@/features/reports/ledger'
import { toCsv } from '@/lib/csv'

const contributionLabels: ContributionLogCsvLabels = {
  date: 'Date',
  enteredAt: 'Entered',
  member: 'Member',
  amount: 'Amount',
  left: 'Left in 2026',
  note: 'Note',
  totals: 'All entries',
}

const CONTRIBUTIONS: ContributionLogRow[] = [
  {
    id: 'c1',
    date: '2026-03-01',
    enteredAt: '2026-03-01',
    name: 'Hana, Bekele',
    amount: 500,
    leftAfter: 500,
    note: 'March',
  },
  {
    id: 'c2',
    date: '2026-06-30',
    enteredAt: '2026-07-02',
    name: 'Fitsum',
    amount: 2000,
    leftAfter: null,
    note: '',
  },
]

describe('contributionsLogCsvRows', () => {
  it('writes a header, one row per payment, and a totals row', () => {
    const csv = toCsv(contributionsLogCsvRows(CONTRIBUTIONS, 2500, contributionLabels))
    expect(csv.split('\r\n')).toEqual([
      'Date,Entered,Member,Amount,Left in 2026,Note',
      '2026-03-01,2026-03-01,"Hana, Bekele",500,500,March',
      // A member with no target that year leaves the column blank.
      '2026-06-30,2026-07-02,Fitsum,2000,,',
      'All entries,,,2500,,',
    ])
  })

  it('keeps a negative remainder, which means the member over-paid', () => {
    const overpaid: ContributionLogRow[] = [
      { ...CONTRIBUTIONS[0], id: 'c3', amount: 1500, leftAfter: -500 },
    ]
    const csv = toCsv(contributionsLogCsvRows(overpaid, 1500, contributionLabels))
    expect(csv).toContain(',1500,-500,')
  })

  it('keeps figures unformatted so a spreadsheet can sum them', () => {
    const rows: ContributionLogRow[] = [{ ...CONTRIBUTIONS[0], amount: 12000, leftAfter: 3000 }]
    const csv = toCsv(contributionsLogCsvRows(rows, 12000, contributionLabels))
    expect(csv).not.toContain('12,000')
    expect(csv).toContain('12000')
  })
})

const repaymentLabels: RepaymentLogCsvLabels = {
  date: 'Date',
  enteredAt: 'Entered',
  borrower: 'Borrower',
  paid: 'Paid',
  interest: 'Interest',
  principal: 'Principal',
  balanceAfter: 'Balance after',
  totals: 'All payments',
}

const REPAYMENTS: RepaymentLogRow[] = [
  {
    id: 'r1',
    date: '2026-02-01',
    enteredAt: '2026-02-01',
    borrower: 'Open, Obsa',
    amount: 500,
    interestPortion: 10,
    principalPortion: 490,
    balanceAfter: 510,
  },
  {
    id: 'r2',
    date: '2026-01-15',
    enteredAt: '2026-09-23',
    borrower: 'Ghost',
    amount: 100,
    interestPortion: null,
    principalPortion: null,
    balanceAfter: null,
  },
]

describe('repaymentsLogCsvRows', () => {
  it('writes a header, one row per payment, and a totals row', () => {
    const csv = toCsv(
      repaymentsLogCsvRows(
        REPAYMENTS,
        { repaid: 600, interest: 10, principal: 490 },
        repaymentLabels,
      ),
    )
    expect(csv.split('\r\n')).toEqual([
      'Date,Entered,Borrower,Paid,Interest,Principal,Balance after',
      '2026-02-01,2026-02-01,"Open, Obsa",500,10,490,510',
      // No loan to allocate against, so the split is blank rather than zero.
      '2026-01-15,2026-09-23,Ghost,100,,,',
      'All payments,,,600,10,490,',
    ])
  })
})
