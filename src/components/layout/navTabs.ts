import type { Role } from '@/lib/types'

export type NavIcon = 'home' | 'reports' | 'loans' | 'admin'

export interface NavTab {
  to: string
  labelKey: string
  icon: NavIcon
  /** Match the path exactly, so `/admin` is not active on `/admin/users`. */
  end?: boolean
  adminOnly: boolean
}

export const NAV_TABS: NavTab[] = [
  { to: '/', labelKey: 'nav.home', icon: 'home', end: true, adminOnly: false },
  { to: '/reports', labelKey: 'nav.reports', icon: 'reports', end: true, adminOnly: false },
  { to: '/admin/loans', labelKey: 'nav.loans', icon: 'loans', end: true, adminOnly: true },
  { to: '/admin', labelKey: 'nav.admin', icon: 'admin', end: true, adminOnly: true },
]

/** Normal users only get the read-only tabs; admins also get the management ones. */
export function navTabsFor(role: Role | null): NavTab[] {
  return NAV_TABS.filter((tab) => !tab.adminOnly || role === 'admin')
}
