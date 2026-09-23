import { useTranslation } from 'react-i18next'

import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { ErrorState } from '@/components/ui/ErrorState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { RecentContributions } from '@/features/contributions/components/RecentContributions'
import { useContributions } from '@/features/contributions/hooks'
import { useLoans, useRepayments } from '@/features/loans/hooks'
import { ContributionsLogTable } from '@/features/reports/components/ContributionsLogTable'
import { PoolSummaryCards } from '@/features/reports/components/PoolSummaryCards'
import { RepaymentsLogTable } from '@/features/reports/components/RepaymentsLogTable'
import { useDateRange } from '@/features/reports/useDateRange'
import { useTargets, useUsers } from '@/features/users/hooks'
import { maxIso } from '@/lib/calc'
import { todayIso } from '@/lib/clock'

export function ReportsPage() {
  const { t } = useTranslation()
  const { data: users, loading: usersLoading, error: usersError, reload: reloadUsers } = useUsers()
  const { data: targets, reload: reloadTargets } = useTargets()
  const {
    data: contributions,
    loading: contributionsLoading,
    error: contributionsError,
    reload: reloadContributions,
  } = useContributions()
  const { data: loans, loading: loansLoading, error: loansError, reload: reloadLoans } = useLoans()
  const {
    data: repayments,
    loading: repaymentsLoading,
    error: repaymentsError,
    reload: reloadRepayments,
  } = useRepayments()

  const { range, setRange } = useDateRange()

  const today = todayIso()
  // Replay each loan up to whichever is later, so a period ending in the future
  // still allocates every repayment inside it.
  const ledgerAsOf = maxIso(today, range.to)
  const loading = usersLoading || contributionsLoading || loansLoading || repaymentsLoading
  const error = usersError ?? contributionsError ?? loansError ?? repaymentsError

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">{t('reports.title')}</h2>
      <p className="mt-1 text-sm text-slate-600">{t('reports.summary')}</p>

      <div className="mt-3">
        <DateRangeFilter range={range} onChange={setRange} />
      </div>

      {loading ? (
        <div className="mt-4">
          <ListSkeleton />
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-4">
          <ErrorState
            onRetry={() => {
              reloadUsers()
              reloadTargets()
              reloadContributions()
              reloadLoans()
              reloadRepayments()
            }}
          />
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          {/* The headline numbers come first, per the mobile-first report layout. */}
          <div className="mt-4">
            <PoolSummaryCards
              targets={targets}
              contributions={contributions}
              loans={loans}
              repayments={repayments}
              range={range}
            />
          </div>

          <div className="mt-6">
            <RecentContributions users={users} contributions={contributions} />
          </div>

          <div className="mt-6">
            <ContributionsLogTable
              contributions={contributions}
              users={users}
              targets={targets}
              range={range}
            />
          </div>

          <div className="mt-6">
            <RepaymentsLogTable
              loans={loans}
              repayments={repayments}
              range={range}
              asOf={ledgerAsOf}
            />
          </div>
        </>
      ) : null}
    </section>
  )
}
