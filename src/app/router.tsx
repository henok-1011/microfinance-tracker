import { Suspense } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'

import {
  AdminHubPage,
  ContributionsPage,
  LoansPage,
  ReportsPage,
  UserListPage,
} from '@/app/lazyPages'
import { AppLayout } from '@/components/layout/AppLayout'
import { Spinner } from '@/components/ui/Spinner'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ProtectedRoute, RequireRole } from '@/features/auth/guards'
import { NotFoundPage } from '@/features/misc/pages/NotFoundPage'
import { DashboardPage } from '@/features/reports/pages/DashboardPage'

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
          {
            // The boundary wraps the outlet so a lazy child can suspend into it.
            element: (
              <Suspense fallback={<Spinner />}>
                <Outlet />
              </Suspense>
            ),
            children: [
              { path: 'reports', element: <ReportsPage /> },
              {
                element: <RequireRole role="admin" />,
                children: [
                  { path: 'admin', element: <AdminHubPage /> },
                  { path: 'admin/users', element: <UserListPage /> },
                  { path: 'admin/contributions', element: <ContributionsPage /> },
                  { path: 'admin/loans', element: <LoansPage /> },
                ],
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
