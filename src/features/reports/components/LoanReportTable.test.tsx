import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

import i18n from '@/i18n'
import { LoanReportTable } from '@/features/reports/components/LoanReportTable'
import type { Loan, Repayment } from '@/lib/types'

function renderTable() {
  const view = render(<LoanReportTable loans={LOANS} repayments={REPAYMENTS} asOf="2026-02-01" />)
  // The footer is where the totals row lives.
  const footer = view.container.querySelector('tfoot')
  return { ...view, footer }
}

function loan(overrides: Partial<Loan>): Loan {
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

function repayment(loanId: string, amount: number, date: string): Repayment {
  return {
    id: `${loanId}_${date}`,
    loanId,
    amount,
    date,
    recordedBy: 'admin',
    createdAt: `${date}T00:00:00.000Z`,
  }
}

// A settled interest-free loan plus an open one that carries interest.
const LOANS: Loan[] = [
  loan({ id: 'L1', borrowerName: 'Settled Selam', principal: 500, annualRatePct: 0 }),
  loan({ id: 'L2', borrowerName: 'Open Obsa', principal: 1000 }),
]

const REPAYMENTS: Repayment[] = [repayment('L1', 500, '2026-01-31')]

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('LoanReportTable', () => {
  it('renders a row per loan with borrower and rate', () => {
    renderTable()
    expect(screen.getByText('Settled Selam')).toBeInTheDocument()
    expect(screen.getByText('Open Obsa')).toBeInTheDocument()
    expect(screen.getByText('12%')).toBeInTheDocument()
  })

  it('derives the status from the live balance, not the stored field', () => {
    renderTable()
    // Both documents say status: 'active'; Selam has been repaid in full.
    expect(screen.getByText('Repaid')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('totals the columns in the footer', () => {
    const { footer } = renderTable()
    expect(footer).not.toBeNull()
    // Disbursed principal = 500 + 1000.
    expect(footer).toHaveTextContent('1,500')
    // Total repaid = the 500 instalment.
    expect(footer).toHaveTextContent('500')
    expect(footer).toHaveTextContent('All loans')
  })

  it('shows an empty state when there are no loans', () => {
    render(<LoanReportTable loans={[]} repayments={[]} asOf="2026-02-01" />)
    expect(screen.getByText('No loans recorded yet.')).toBeInTheDocument()
  })
})
