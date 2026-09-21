import { lazy } from 'react'

/**
 * Code-split screens. Kept out of `router.tsx` so that file stays a pure route
 * table, and defined once at module scope so the lazy component identity is
 * stable. Login and the dashboard stay eager: one of them is always the first
 * paint.
 */
export const AdminHubPage = lazy(() =>
  import('@/features/admin/pages/AdminHubPage').then((module) => ({
    default: module.AdminHubPage,
  })),
)

export const ContributionsPage = lazy(() =>
  import('@/features/contributions/pages/ContributionsPage').then((module) => ({
    default: module.ContributionsPage,
  })),
)

export const LoansPage = lazy(() =>
  import('@/features/loans/pages/LoansPage').then((module) => ({
    default: module.LoansPage,
  })),
)

export const ReportsPage = lazy(() =>
  import('@/features/reports/pages/ReportsPage').then((module) => ({
    default: module.ReportsPage,
  })),
)

export const UserListPage = lazy(() =>
  import('@/features/users/pages/UserListPage').then((module) => ({
    default: module.UserListPage,
  })),
)
