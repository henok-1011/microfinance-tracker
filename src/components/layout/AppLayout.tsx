import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'

import { LanguageToggle } from '@/components/LanguageToggle'
import { useAuth } from '@/features/auth/useAuth'

export function AppLayout() {
  const { t } = useTranslation()
  const { profile, user, signOut } = useAuth()
  const displayName = profile?.name ?? user?.email ?? ''

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-900">{t('app.title')}</h1>
          {displayName ? <p className="truncate text-xs text-slate-500">{displayName}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle />
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            {t('auth.signOut')}
          </button>
        </div>
      </header>
      <main className="flex-1 px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}
