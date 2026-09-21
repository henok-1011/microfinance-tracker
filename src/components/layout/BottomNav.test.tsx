import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import i18n from '@/i18n'
import { BottomNav } from '@/components/layout/BottomNav'

const auth = vi.hoisted(() => ({ role: 'user' as 'user' | 'admin' | null }))

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ role: auth.role }),
}))

function renderNav(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('BottomNav', () => {
  it('shows only the read-only tabs to a normal user', () => {
    auth.role = 'user'
    renderNav()

    expect(screen.getByRole('link', { name: /Home/ })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /Reports/ })).toHaveAttribute('href', '/reports')
    expect(screen.queryByRole('link', { name: /Admin/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Loans/ })).not.toBeInTheDocument()
  })

  it('adds the management tabs for an admin', () => {
    auth.role = 'admin'
    renderNav()

    expect(screen.getByRole('link', { name: /Loans/ })).toHaveAttribute('href', '/admin/loans')
    expect(screen.getByRole('link', { name: /Admin/ })).toHaveAttribute('href', '/admin')
  })

  it('marks the current tab for assistive technology', () => {
    auth.role = 'admin'
    renderNav('/reports')

    expect(screen.getByRole('link', { name: /Reports/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Home/ })).not.toHaveAttribute('aria-current')
  })

  it('exposes the tab bar as a labelled navigation landmark', () => {
    auth.role = 'user'
    renderNav()

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
  })
})
