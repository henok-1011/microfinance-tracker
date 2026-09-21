import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useAuth } from '@/features/auth/useAuth'

export function DashboardPage() {
  const { t } = useTranslation()
  const { role } = useAuth()

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">{t('reports.dashboard')}</h2>
      <p className="mt-2 text-sm text-slate-600">{t('reports.placeholder')}</p>

      {role === 'admin' ? (
        <Link
          to="/admin/users"
          className="mt-5 block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-500"
        >
          <p className="text-sm font-semibold text-slate-900">{t('admin.users.title')}</p>
          <p className="mt-1 text-xs text-slate-500">{t('admin.users.summary')}</p>
        </Link>
      ) : null}
    </section>
  )
}
