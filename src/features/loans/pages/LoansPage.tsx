import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/ui/ErrorState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { AddLoanForm } from '@/features/loans/components/AddLoanForm'
import { LoanList } from '@/features/loans/components/LoanList'
import { RecordRepaymentForm } from '@/features/loans/components/RecordRepaymentForm'
import { useLoans, useRepayments } from '@/features/loans/hooks'
import { todayIso } from '@/lib/clock'

export function LoansPage() {
  const { t } = useTranslation()
  const { data: loans, loading: loansLoading, error: loansError, reload: reloadLoans } = useLoans()
  const {
    data: repayments,
    loading: repaymentsLoading,
    error: repaymentsError,
    reload: reloadRepayments,
  } = useRepayments()

  const today = todayIso()
  const loading = loansLoading || repaymentsLoading
  const error = loansError ?? repaymentsError

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">{t('admin.loans.title')}</h2>
      <p className="mt-1 text-sm text-slate-600">{t('admin.loans.summary')}</p>

      {loading ? (
        <div className="mt-4">
          <ListSkeleton />
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-4">
          <ErrorState
            onRetry={() => {
              reloadLoans()
              reloadRepayments()
            }}
          />
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="mt-4">
            <AddLoanForm />
          </div>

          <div className="mt-4">
            <RecordRepaymentForm loans={loans} repayments={repayments} today={today} />
          </div>

          <div className="mt-6">
            <LoanList loans={loans} repayments={repayments} today={today} />
          </div>
        </>
      ) : null}
    </section>
  )
}
