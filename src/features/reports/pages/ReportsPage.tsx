import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/ui/ErrorState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { YearSelect } from '@/components/ui/YearSelect'
import { useContributions } from '@/features/contributions/hooks'
import { useLoans, useRepayments } from '@/features/loans/hooks'
import { ContributionsReportTable } from '@/features/reports/components/ContributionsReportTable'
import { LoanReportTable } from '@/features/reports/components/LoanReportTable'
import { PoolSummaryCards } from '@/features/reports/components/PoolSummaryCards'
import { useTargets, useUsers } from '@/features/users/hooks'
import { todayIso } from '@/lib/calc'

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

  const [year, setYear] = useState(() => new Date().getFullYear())

  const today = todayIso()
  const loading = usersLoading || contributionsLoading || loansLoading || repaymentsLoading
  const error = usersError ?? contributionsError ?? loansError ?? repaymentsError

  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">{t('reports.title')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('reports.summary')}</p>
        </div>
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
          {/* The headline numbers come first, per the mobile-first report layout. */}
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
            <ContributionsReportTable
              users={users}
              targets={targets}
              contributions={contributions}
              year={year}
            />
          </div>

          <div className="mt-6">
            <LoanReportTable loans={loans} repayments={repayments} asOf={today} />
          </div>
        </>
      ) : null}
    </section>
  )
}
