import type { ContributionLogRow, RepaymentLogRow } from '@/features/reports/ledger'
import type { CsvCell } from '@/lib/csv'

export interface ContributionLogCsvLabels {
  date: string
  enteredAt: string
  member: string
  amount: string
  left: string
  note: string
  totals: string
}

export interface RepaymentLogCsvLabels {
  date: string
  enteredAt: string
  borrower: string
  paid: string
  interest: string
  principal: string
  balanceAfter: string
  totals: string
}

export interface RepaymentLogCsvTotals {
  repaid: number
  interest: number
  principal: number
}

/**
 * Contribution log as CSV.
 *
 * Labels come from the active locale, but every figure stays a plain number (no
 * grouping or currency symbol) so a spreadsheet can sum the column. A negative
 * `left` is kept as-is: it means the member over-contributed that year.
 */
export function contributionsLogCsvRows(
  rows: ContributionLogRow[],
  total: number,
  labels: ContributionLogCsvLabels,
): CsvCell[][] {
  return [
    [labels.date, labels.enteredAt, labels.member, labels.amount, labels.left, labels.note],
    ...rows.map((row): CsvCell[] => [
      row.date,
      row.enteredAt,
      row.name,
      row.amount,
      // Blank rather than zero: the member has no target that year.
      row.leftAfter ?? '',
      row.note,
    ]),
    // One amount for the whole period: per-row remainders have no meaningful sum.
    [labels.totals, '', '', total, '', ''],
  ]
}

/** Repayment log as CSV, totalled from the rows so the footer agrees with them. */
export function repaymentsLogCsvRows(
  rows: RepaymentLogRow[],
  totals: RepaymentLogCsvTotals,
  labels: RepaymentLogCsvLabels,
): CsvCell[][] {
  return [
    [
      labels.date,
      labels.enteredAt,
      labels.borrower,
      labels.paid,
      labels.interest,
      labels.principal,
      labels.balanceAfter,
    ],
    ...rows.map((row): CsvCell[] => [
      row.date,
      row.enteredAt,
      row.borrower,
      row.amount,
      // Blank rather than zero: the row has no loan to allocate against.
      row.interestPortion ?? '',
      row.principalPortion ?? '',
      row.balanceAfter ?? '',
    ]),
    [labels.totals, '', '', totals.repaid, totals.interest, totals.principal, ''],
  ]
}
