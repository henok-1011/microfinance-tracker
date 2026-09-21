import { useTranslation } from 'react-i18next'

import type { LoanBalance } from '@/lib/calc'
import { formatETB } from '@/lib/format'

interface LoanDetailProps {
  balance: LoanBalance
}

export function LoanDetail({ balance }: LoanDetailProps) {
  const { t, i18n } = useTranslation()
  const history = [...balance.allocations].reverse()

  const totals = [
    { label: t('admin.loans.principalOutstanding'), value: balance.principalOutstanding },
    { label: t('admin.loans.interestAccrued'), value: balance.interestAccrued },
    { label: t('admin.loans.interestPaid'), value: balance.interestPaid },
    { label: t('admin.loans.totalPaid'), value: balance.totalPaid },
  ]

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <dl className="grid grid-cols-2 gap-2">
        {totals.map((entry) => (
          <div key={entry.label}>
            <dt className="text-[11px] text-slate-500">{entry.label}</dt>
            <dd className="text-xs font-medium text-slate-900">
              {formatETB(entry.value, i18n.language)}
            </dd>
          </div>
        ))}
      </dl>

      <h4 className="mt-3 text-xs font-semibold text-slate-900">{t('admin.loans.repayments')}</h4>

      {history.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500">{t('admin.loans.noRepayments')}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {history.map((allocation) => (
            <li key={allocation.repaymentId} className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-slate-600">{allocation.date}</span>
                <span className="text-xs font-semibold text-slate-900">
                  {formatETB(allocation.amount, i18n.language)}
                </span>
              </div>
              <dl className="mt-1 grid grid-cols-3 gap-2">
                <div>
                  <dt className="text-[11px] text-slate-500">
                    {t('admin.loans.allocation.interest')}
                  </dt>
                  <dd className="text-[11px] font-medium text-slate-700">
                    {formatETB(allocation.interestPortion, i18n.language)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">
                    {t('admin.loans.allocation.principal')}
                  </dt>
                  <dd className="text-[11px] font-medium text-slate-700">
                    {formatETB(allocation.principalPortion, i18n.language)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">
                    {t('admin.loans.allocation.balance')}
                  </dt>
                  <dd className="text-[11px] font-medium text-slate-700">
                    {formatETB(allocation.balanceAfter, i18n.language)}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
