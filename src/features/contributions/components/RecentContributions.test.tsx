import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

import i18n from '@/i18n'
import { RecentContributions } from '@/features/contributions/components/RecentContributions'
import type { Contribution, UserProfile } from '@/lib/types'

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

function payment(userId: string, date: string, amount: number, note = ''): Contribution {
  return {
    id: `${userId}_${date}`,
    userId,
    year: Number(date.slice(0, 4)),
    amount,
    date,
    note,
    recordedBy: 'admin',
    createdAt: `${date}T00:00:00.000Z`,
  }
}

const USERS = [user('u1', 'Hana'), user('u2', 'Fitsum')]

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('RecentContributions', () => {
  it('lists the newest payments first', () => {
    render(
      <RecentContributions
        users={USERS}
        contributions={[
          payment('u1', '2026-01-10', 100),
          payment('u2', '2026-03-10', 300),
          payment('u1', '2026-02-10', 200),
        ]}
      />,
    )
    const names = screen.getAllByText(/Hana|Fitsum/).map((node) => node.textContent)
    expect(names).toEqual(['Fitsum', 'Hana', 'Hana'])
  })

  it('keeps only the requested number of entries', () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      payment('u1', `2026-01-0${index + 1}`, index + 1),
    )
    render(<RecentContributions users={USERS} contributions={many} limit={3} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('shows the amount and the optional note', () => {
    const { container } = render(
      <RecentContributions
        users={USERS}
        contributions={[payment('u1', '2026-04-01', 1500, 'March arrears')]}
      />,
    )
    expect(container).toHaveTextContent('2026-04-01')
    expect(container).toHaveTextContent('March arrears')
    expect(container).toHaveTextContent(/1,?500/)
  })

  it('falls back to the user id when the member is unknown', () => {
    render(<RecentContributions users={USERS} contributions={[payment('u9', '2026-04-01', 10)]} />)
    expect(screen.getByText('u9')).toBeInTheDocument()
  })

  it('shows an empty state with no contributions', () => {
    render(<RecentContributions users={USERS} contributions={[]} />)
    expect(screen.getByText('No contributions recorded yet.')).toBeInTheDocument()
  })
})
