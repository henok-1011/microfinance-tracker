import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { FullPageSpinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/useAuth'
import type { Role } from '@/lib/types'

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()
  const { t } = useTranslation()

  if (status === 'loading') {
    return <FullPageSpinner label={t('common.loading')} />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}

export function RequireRole({ role }: { role: Role }) {
  const { role: currentRole } = useAuth()

  if (currentRole !== role) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
