import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'

import { BottomNav } from '@/components/layout/BottomNav'
import { LanguageToggle } from '@/components/LanguageToggle'
import { useAuth } from '@/features/auth/useAuth'

export function AppLayout() {
  const { t } = useTranslation()
  const { profile, user, role, signOut } = useAuth()
  const displayName = profile?.name ?? user?.email ?? ''

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-900">{t('app.title')}</h1>
            <p className="mt-0.5 flex items-center gap-1.5">
              {displayName ? (
                <span className="truncate text-xs text-slate-500">{displayName}</span>
              ) : null}
              {role ? (
                <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {t(`roles.${role}`)}
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle />
            <button
              type="button"
              onClick={() => void signOut()}
              className="min-h-11 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              {t('auth.signOut')}
            </button>
          </div>
        </div>
      </header>

      {/* pb clears the fixed tab bar plus the home indicator on notched phones. */}
      <main className="flex-1 px-4 pt-4 pb-24">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
