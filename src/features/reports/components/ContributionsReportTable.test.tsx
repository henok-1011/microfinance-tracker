import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

import i18n from '@/i18n'
import { ContributionsReportTable } from '@/features/reports/components/ContributionsReportTable'
import type { Contribution, Target, UserProfile } from '@/lib/types'

function user(uid: string, name: string): UserProfile {
  return {
    uid,
    name,
    email: `${uid}@example.com`,
    phone: '',
    role: 'user',
    expectedYearly: 0,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function target(uid: string, year: number, amount: number): Target {
  return { id: `${uid}_${year}`, userId: uid, year, amount }
}

function contribution(uid: string, year: number, amount: number): Contribution {
  return {
    id: `${uid}_${year}_${amount}`,
    userId: uid,
    year,
    amount,
    date: `${year}-01-15`,
    note: '',
    recordedBy: 'admin',
    createdAt: `${year}-01-15T00:00:00.000Z`,
  }
}

const USERS = [user('u1', 'Half Hana'), user('u2', 'Full Fitsum')]
const TARGETS = [target('u1', 2026, 1000), target('u2', 2026, 2000)]
const CONTRIBUTIONS = [contribution('u1', 2026, 500), contribution('u2', 2026, 2000)]

function renderTable() {
  const view = render(
    <ContributionsReportTable
      users={USERS}
      targets={TARGETS}
      contributions={CONTRIBUTIONS}
      year={2026}
    />,
  )
  return { ...view, footer: view.container.querySelector('tfoot') }
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('ContributionsReportTable', () => {
  it('lists each member with their progress', () => {
    renderTable()
    expect(screen.getByText('Half Hana')).toBeInTheDocument()
    expect(screen.getByText('Full Fitsum')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('flags a member who has met their target', () => {
    renderTable()
    expect(screen.getByText('Fully paid')).toBeInTheDocument()
  })

  it('totals the year in the footer', () => {
    const { footer } = renderTable()
    expect(footer).not.toBeNull()
    expect(footer).toHaveTextContent(/3,?000/) // total target
    expect(footer).toHaveTextContent(/2,?500/) // total contributed
    expect(footer).toHaveTextContent('83%') // 2500 / 3000
  })

  it('scopes rows to the requested year', () => {
    render(
      <ContributionsReportTable
        users={USERS}
        targets={[...TARGETS, target('u1', 2025, 1000)]}
        contributions={CONTRIBUTIONS}
        year={2025}
      />,
    )
    expect(screen.getByText('Half Hana')).toBeInTheDocument()
    expect(screen.queryByText('Full Fitsum')).not.toBeInTheDocument()
  })

  it('shows an empty state when the year has no targets', () => {
    render(<ContributionsReportTable users={USERS} targets={[]} contributions={[]} year={2026} />)
    expect(screen.getByText('No yearly targets set for 2026.')).toBeInTheDocument()
  })
})
