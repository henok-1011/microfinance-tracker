import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

import i18n from '@/i18n'
import { PoolSummaryCards } from '@/features/reports/components/PoolSummaryCards'
import type { Contribution, Loan, Target } from '@/lib/types'

// Interest-free so every figure is independent of the date the test runs on.
const LOAN: Loan = {
  id: 'L1',
  borrowerName: 'Borrower',
  borrowerPhone: '',
  principal: 1200,
  annualRatePct: 0,
  startDate: '2026-01-01',
  dueDate: '2026-12-31',
  status: 'active',
  createdBy: 'admin',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const TARGET: Target = { id: 'u1_2026', userId: 'u1', year: 2026, amount: 5000 }

const CONTRIBUTION: Contribution = {
  id: 'c1',
  userId: 'u1',
  year: 2026,
  amount: 5000,
  date: '2026-01-15',
  note: '',
  recordedBy: 'admin',
  createdAt: '2026-01-15T00:00:00.000Z',
}

function renderCards() {
  const view = render(
    <PoolSummaryCards
      targets={[TARGET]}
      contributions={[CONTRIBUTION]}
      loans={[LOAN]}
      repayments={[]}
      year={2026}
    />,
  )
  return view
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('PoolSummaryCards', () => {
  it('renders every headline figure', () => {
    renderCards()
    expect(screen.getByText('Cash on hand')).toBeInTheDocument()
    expect(screen.getByText('Outstanding contributions')).toBeInTheDocument()
    expect(screen.getByText('Loan book outstanding')).toBeInTheDocument()
    expect(screen.getByText('Projected pool')).toBeInTheDocument()
    expect(screen.getByText('Interest earned')).toBeInTheDocument()
  })

  it('derives cash on hand as contributed minus disbursed plus repaid', () => {
    const { container } = renderCards()
    expect(container).toHaveTextContent(/3,?800/) // 5000 - 1200
  })

  it('reports the outstanding loan book', () => {
    const { container } = renderCards()
    expect(container).toHaveTextContent(/1,?200/)
  })
})
