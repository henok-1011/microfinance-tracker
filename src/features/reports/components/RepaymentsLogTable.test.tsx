import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

import i18n from '@/i18n'
import { RepaymentsLogTable } from '@/features/reports/components/RepaymentsLogTable'
import type { Loan, Repayment } from '@/lib/types'

const RANGE = { from: '2026-01-01', to: '2026-12-31' }
const AS_OF = '2026-12-31'

const LOANS: Loan[] = [
  {
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
  },
]

/** `enteredAt` defaults to the payment date; pass it to model a backdated entry. */
function repayment(
  id: string,
  date: string,
  amount: number,
  loanId = 'L1',
  enteredAt = date,
): Repayment {
  return {
    id,
    loanId,
    amount,
    date,
    recordedBy: 'admin',
    createdAt: `${enteredAt}T09:30:00.000Z`,
  }
}

function renderTable(repayments: Repayment[]) {
  const view = render(
    <RepaymentsLogTable loans={LOANS} repayments={repayments} range={RANGE} asOf={AS_OF} />,
  )
  return {
    ...view,
    // Re-queried on demand, so the helper stays valid after a re-render.
    bodyRows: () => view.container.querySelectorAll('tbody tr'),
    footer: () => view.container.querySelector('tfoot'),
  }
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('RepaymentsLogTable', () => {
  const repayments = [repayment('r1', '2026-02-01', 500), repayment('r2', '2026-03-01', 100)]

  it('appends one row per payment rather than collapsing them onto a loan', () => {
    const { bodyRows } = renderTable(repayments)
    expect(bodyRows()).toHaveLength(2)
    expect(screen.getAllByText('Obsa')).toHaveLength(2)
  })

  it('lists the newest payment first', () => {
    const { bodyRows } = renderTable(repayments)
    expect(bodyRows()[0]).toHaveTextContent('2026-03-01')
    expect(bodyRows()[1]).toHaveTextContent('2026-02-01')
  })

  it('shows the date the repayment was entered, not just the payment date', () => {
    // Recorded months after the payment it covers.
    const { bodyRows } = renderTable([repayment('r1', '2026-02-01', 500, 'L1', '2026-09-23')])
    expect(bodyRows()[0]).toHaveTextContent('2026-02-01')
    expect(bodyRows()[0]).toHaveTextContent('2026-09-23')
  })

  it('shows the interest and principal split and the balance after', () => {
    const { bodyRows } = renderTable(repayments)
    // March's 100 is 5.1 of interest on the 510 February left, then 94.9 off.
    expect(bodyRows()[0]).toHaveTextContent('100')
    expect(bodyRows()[0]).toHaveTextContent('5.1')
    expect(bodyRows()[0]).toHaveTextContent('94.9')
    expect(bodyRows()[0]).toHaveTextContent('415.1')
  })

  it('totals the period in the footer', () => {
    const { footer } = renderTable(repayments)
    expect(footer()).not.toBeNull()
    expect(footer()).toHaveTextContent('600')
    expect(footer()).toHaveTextContent('15.1')
    expect(footer()).toHaveTextContent('584.9')
    expect(footer()).toHaveTextContent('2 entries')
  })

  it('reports a payment with no matching loan without inventing a split', () => {
    const { bodyRows } = renderTable([repayment('r9', '2026-02-01', 250, 'gone')])
    expect(bodyRows()[0]).toHaveTextContent('250')
    expect(bodyRows()[0]).toHaveTextContent('—')
  })

  it('shows an empty state for a period with no payments', () => {
    renderTable([])
    expect(screen.getByText('No repayments in this period.')).toBeInTheDocument()
  })
})
