import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/ui/ErrorState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { YearSelect } from '@/components/ui/YearSelect'
import { UserProgressCards } from '@/features/contributions/components/UserProgressCards'
import { useContributions } from '@/features/contributions/hooks'
import { useLoans, useRepayments } from '@/features/loans/hooks'
import { PoolSummaryCards } from '@/features/reports/components/PoolSummaryCards'
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

  const [year, setYear] = useState(() => new Date().getFullYear())

  const loading = usersLoading || contributionsLoading || loansLoading || repaymentsLoading
  const error = usersError ?? contributionsError ?? loansError ?? repaymentsError

  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{t('reports.dashboard')}</h2>
        <div className="shrink-0 pt-0.5">
          <YearSelect value={year} onChange={setYear} />
        </div>
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
              year={year}
            />
          </div>

          <div className="mt-6">
            <UserProgressCards
              users={users}
              targets={targets}
              contributions={contributions}
              year={year}
            />
          </div>
        </>
      ) : null}
    </section>
  )
}
