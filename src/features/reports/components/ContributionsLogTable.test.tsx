import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

import i18n from '@/i18n'
import { ContributionsLogTable } from '@/features/reports/components/ContributionsLogTable'
import type { Contribution, Target, UserProfile } from '@/lib/types'

const RANGE = { from: '2026-01-01', to: '2026-12-31' }

const TARGETS: Target[] = [{ id: 'u1_2026', userId: 'u1', year: 2026, amount: 5000 }]

const USERS: UserProfile[] = [
  {
    uid: 'u1',
    name: 'Almaz',
    phone: '0911223344',
    role: 'user',
    expectedYearly: 0,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

/** Twelve payments of 100, so the footer total (1,200) exceeds one page. */
function twelveContributions(): Contribution[] {
  return Array.from({ length: 12 }, (_, index) => {
    const day = String(index + 1).padStart(2, '0')
    const date = `2026-01-${day}`
    return {
      id: `c${index}`,
      userId: 'u1',
      year: 2026,
      amount: 100,
      date,
      note: '',
      recordedBy: 'admin',
      createdAt: `${date}T00:00:00.000Z`,
    }
  })
}

function renderTable(contributions: Contribution[]) {
  const view = render(
    <ContributionsLogTable
      contributions={contributions}
      users={USERS}
      targets={TARGETS}
      range={RANGE}
    />,
  )
  return {
    ...view,
    // Re-queried on demand: a NodeList captured before a click is stale.
    bodyRows: () => view.container.querySelectorAll('tbody tr'),
    footer: () => view.container.querySelector('tfoot'),
  }
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('ContributionsLogTable', () => {
  it('appends one row per payment rather than collapsing them onto a member', () => {
    const { bodyRows } = renderTable(twelveContributions().slice(0, 2))
    expect(bodyRows()).toHaveLength(2)
    expect(screen.getAllByText('Almaz')).toHaveLength(2)
  })

  it('lists the newest payment first', () => {
    const { bodyRows } = renderTable(twelveContributions().slice(0, 2))
    expect(bodyRows()[0]).toHaveTextContent('2026-01-02')
    expect(bodyRows()[1]).toHaveTextContent('2026-01-01')
  })

  it('shows the first page and how many pages there are', () => {
    const { bodyRows } = renderTable(twelveContributions())
    expect(bodyRows()).toHaveLength(10)
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  })

  it('totals the whole period, not just the visible page', () => {
    const { footer } = renderTable(twelveContributions())
    expect(footer()).not.toBeNull()
    expect(footer()).toHaveTextContent('1,200')
    expect(footer()).toHaveTextContent('12 entries')
  })

  it('pages forward to the remaining rows', () => {
    const { bodyRows } = renderTable(twelveContributions())
    expect(bodyRows()).toHaveLength(10)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(bodyRows()).toHaveLength(2)
    expect(bodyRows()[0]).toHaveTextContent('2026-01-02')
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('hides page controls when everything fits on one page', () => {
    const { bodyRows } = renderTable(twelveContributions().slice(0, 3))
    expect(bodyRows()).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('shows the date the payment was entered, not just the payment date', () => {
    const backdated = { ...twelveContributions()[0], createdAt: '2026-09-23T08:00:00.000Z' }
    const { bodyRows } = renderTable([backdated])

    expect(bodyRows()[0]).toHaveTextContent('2026-01-01')
    expect(bodyRows()[0]).toHaveTextContent('2026-09-23')
  })

  it('shows the yearly remainder after each payment', () => {
    const { bodyRows } = renderTable(twelveContributions())

    // Newest first, and by then the member has paid 12 x 100 against a 5,000 target.
    expect(bodyRows()[0]).toHaveTextContent('3,800')
    expect(screen.getByRole('columnheader', { name: 'Left in 2026' })).toBeInTheDocument()
  })

  it('shows an empty state for a period with no payments', () => {
    renderTable([])
    expect(screen.getByText('No contributions in this period.')).toBeInTheDocument()
  })
})
