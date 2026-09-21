import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ProtectedRoute, RequireRole } from '@/features/auth/guards'
import { ContributionsPage } from '@/features/contributions/pages/ContributionsPage'
import { LoansPage } from '@/features/loans/pages/LoansPage'
import { NotFoundPage } from '@/features/misc/pages/NotFoundPage'
import { DashboardPage } from '@/features/reports/pages/DashboardPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { UserListPage } from '@/features/users/pages/UserListPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'reports', element: <ReportsPage /> },
          {
            element: <RequireRole role="admin" />,
            children: [
              { path: 'admin/users', element: <UserListPage /> },
              { path: 'admin/contributions', element: <ContributionsPage /> },
              { path: 'admin/loans', element: <LoansPage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
