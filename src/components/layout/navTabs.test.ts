import { describe, expect, it } from 'vitest'

import { navTabsFor } from '@/components/layout/navTabs'

describe('navTabsFor', () => {
  it('gives a normal user only the read-only tabs', () => {
    expect(navTabsFor('user').map((tab) => tab.to)).toEqual(['/', '/reports'])
  })

  it('adds the management tabs for an admin', () => {
    expect(navTabsFor('admin').map((tab) => tab.to)).toEqual([
      '/',
      '/reports',
      '/admin/loans',
      '/admin',
    ])
  })

  it('treats an unknown role as a normal user, never an admin', () => {
    expect(navTabsFor(null).map((tab) => tab.to)).toEqual(['/', '/reports'])
  })

  it('marks every tab with a label key and exact matching for the hub', () => {
    for (const tab of navTabsFor('admin')) {
      expect(tab.labelKey).toMatch(/^nav\./)
    }
    const hub = navTabsFor('admin').find((tab) => tab.to === '/admin')
    expect(hub?.end).toBe(true)
  })
})
