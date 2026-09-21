import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ProtectedRoute, RequireRole } from '@/features/auth/guards'
import { NotFoundPage } from '@/features/misc/pages/NotFoundPage'
import { DashboardPage } from '@/features/reports/pages/DashboardPage'
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
          {
            element: <RequireRole role="admin" />,
            children: [{ path: 'admin/users', element: <UserListPage /> }],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
