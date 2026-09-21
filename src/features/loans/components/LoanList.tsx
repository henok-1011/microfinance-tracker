import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LoanDetail } from '@/features/loans/components/LoanDetail'
import { loansWithBalance } from '@/lib/calc'
import { formatETB } from '@/lib/format'
import type { Loan, Repayment } from '@/lib/types'

interface LoanListProps {
  loans: Loan[]
  repayments: Repayment[]
  today: string
}

export function LoanList({ loans, repayments, today }: LoanListProps) {
  const { t, i18n } = useTranslation()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const entries = useMemo(
    () => loansWithBalance(loans, repayments, today),
    [loans, repayments, today],
  )

  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
        {t('admin.loans.empty')}
      </p>
    )
  }

  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-900">{t('admin.loans.listTitle')}</h3>

      <ul className="mt-3 space-y-2">
        {entries.map(({ loan, balance }) => {
          const expanded = expandedId === loan.id
          return (
            <li key={loan.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{loan.borrowerName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {loan.startDate} → {loan.dueDate}
                  </p>
                  {loan.borrowerPhone ? (
                    <p className="text-xs text-slate-500">{loan.borrowerPhone}</p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    balance.isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-brand-700'
                  }`}
                >
                  {balance.isPaid ? t('admin.loans.status.paid') : t('admin.loans.status.active')}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-[11px] text-slate-500">{t('admin.loans.principal')}</dt>
                  <dd className="text-xs font-medium text-slate-900">
                    {formatETB(loan.principal, i18n.language)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">{t('admin.loans.rate')}</dt>
                  <dd className="text-xs font-medium text-slate-900">{loan.annualRatePct}%</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">{t('admin.loans.outstanding')}</dt>
                  <dd className="text-xs font-semibold text-slate-900">
                    {formatETB(balance.totalOutstanding, i18n.language)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">{t('admin.loans.breakdown')}</dt>
                  <dd className="text-xs text-slate-700">
                    {formatETB(balance.principalOutstanding, i18n.language)} +{' '}
                    {formatETB(balance.interestOutstanding, i18n.language)}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : loan.id)}
                aria-expanded={expanded}
                className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                {expanded ? t('common.hide') : t('admin.loans.details')}
              </button>

              {expanded ? <LoanDetail balance={balance} /> : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
