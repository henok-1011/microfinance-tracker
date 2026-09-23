import { useTranslation } from 'react-i18next'

import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { ErrorState } from '@/components/ui/ErrorState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { RecentContributions } from '@/features/contributions/components/RecentContributions'
import { UserProgressCards } from '@/features/contributions/components/UserProgressCards'
import { useContributions } from '@/features/contributions/hooks'
import { useLoans, useRepayments } from '@/features/loans/hooks'
import { PoolSummaryCards } from '@/features/reports/components/PoolSummaryCards'
import { useDateRange } from '@/features/reports/useDateRange'
import { useTargets, useUsers } from '@/features/users/hooks'

export function DashboardPage() {
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

  const loading = usersLoading || contributionsLoading || loansLoading || repaymentsLoading
  const error = usersError ?? contributionsError ?? loansError ?? repaymentsError

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">{t('reports.dashboard')}</h2>

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
            <UserProgressCards
              users={users}
              targets={targets}
              contributions={contributions}
              range={range}
            />
          </div>
        </>
      ) : null}
    </section>
  )
}
