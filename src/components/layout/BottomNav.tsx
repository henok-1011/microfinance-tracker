import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { navTabsFor, type NavIcon } from '@/components/layout/navTabs'
import { useAuth } from '@/features/auth/useAuth'

const ICON_PATHS: Record<NavIcon, string[]> = {
  home: ['M3.5 10.5 12 3.5l8.5 7', 'M5.5 9.5V20h13V9.5'],
  reports: ['M4 20v-5', 'M10 20V5', 'M16 20v-8', 'M2.5 20h19'],
  loans: ['M3 7.5h18v9H3z', 'M12 12h.01', 'M7 10v4', 'M17 10v4'],
  admin: ['M3.5 6h17', 'M3.5 12h17', 'M3.5 18h17', 'M9 3v6', 'M15 9v6'],
}

function TabIcon({ icon }: { icon: NavIcon }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      {ICON_PATHS[icon].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}

export function BottomNav() {
  const { t } = useTranslation()
  const { role } = useAuth()
  const tabs = navTabsFor(role)

  return (
    <nav
      aria-label={t('nav.primary')}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex w-full max-w-screen-sm">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand-700' : 'text-slate-500 hover:text-slate-700'
                }`
              }
            >
              <TabIcon icon={tab.icon} />
              <span className="truncate">{t(tab.labelKey)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
