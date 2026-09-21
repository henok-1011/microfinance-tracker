import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/ui/EmptyState'
import { loansWithBalance, sum } from '@/lib/calc'
import { formatAmount, formatETB } from '@/lib/format'
import type { Loan, Repayment } from '@/lib/types'

const cellClass = 'whitespace-nowrap px-3 py-2 text-right tabular-nums'
const headClass = 'whitespace-nowrap px-3 py-2 text-right font-medium'

interface LoanReportTableProps {
  loans: Loan[]
  repayments: Repayment[]
  asOf: string
}

export function LoanReportTable({ loans, repayments, asOf }: LoanReportTableProps) {
  const { t, i18n } = useTranslation()

  const entries = useMemo(
    () => loansWithBalance(loans, repayments, asOf),
    [loans, repayments, asOf],
  )

  // Totalled from the rows so the footer always agrees with the column above it.
  const totals = useMemo(
    () => ({
      principal: sum(entries.map((entry) => entry.loan.principal)),
      paid: sum(entries.map((entry) => entry.balance.totalPaid)),
      interest: sum(entries.map((entry) => entry.balance.interestPaid)),
      outstanding: sum(entries.map((entry) => entry.balance.totalOutstanding)),
    }),
    [entries],
  )

  if (entries.length === 0) {
    return <EmptyState message={t('reports.loanTableEmpty')} />
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{t('reports.loanTitle')}</h3>
        <p className="shrink-0 text-xs text-slate-500">{t('reports.amountsInEtb')}</p>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th scope="col" className="whitespace-nowrap px-3 py-2 text-left font-medium">
                {t('reports.columns.borrower')}
              </th>
              <th scope="col" className={headClass}>
                {t('reports.columns.principal')}
              </th>
              <th scope="col" className={headClass}>
                {t('reports.columns.rate')}
              </th>
              <th scope="col" className={headClass}>
                {t('reports.columns.start')}
              </th>
              <th scope="col" className={headClass}>
                {t('reports.columns.due')}
              </th>
              <th scope="col" className={headClass}>
                {t('reports.columns.paid')}
              </th>
              <th scope="col" className={headClass}>
                {t('reports.columns.interest')}
              </th>
              <th scope="col" className={headClass}>
                {t('reports.columns.outstanding')}
              </th>
              <th scope="col" className={headClass}>
                {t('reports.columns.status')}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {entries.map(({ loan, balance }) => (
              <tr key={loan.id}>
                <th
                  scope="row"
                  className="max-w-[9rem] truncate px-3 py-2 text-left font-medium text-slate-900"
                >
                  {loan.borrowerName}
                </th>
                <td className={`${cellClass} text-slate-700`}>
                  {formatAmount(loan.principal, i18n.language)}
                </td>
                <td className={`${cellClass} text-slate-700`}>{loan.annualRatePct}%</td>
                <td className={`${cellClass} text-slate-500`}>{loan.startDate}</td>
                <td className={`${cellClass} text-slate-500`}>{loan.dueDate}</td>
                <td className={`${cellClass} text-slate-700`}>
                  {formatAmount(balance.totalPaid, i18n.language)}
                </td>
                <td className={`${cellClass} text-slate-700`}>
                  {formatAmount(balance.interestPaid, i18n.language)}
                </td>
                <td className={`${cellClass} font-medium text-slate-900`}>
                  {formatAmount(balance.totalOutstanding, i18n.language)}
                </td>
                <td className={cellClass}>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      balance.isPaid
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-brand-50 text-brand-700'
                    }`}
                  >
                    {balance.isPaid ? t('admin.loans.status.paid') : t('admin.loans.status.active')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
            <tr>
              <th scope="row" className="whitespace-nowrap px-3 py-2 text-left">
                {t('reports.loanTotals')}
              </th>
              <td className={cellClass}>{formatAmount(totals.principal, i18n.language)}</td>
              <td className={cellClass} />
              <td className={cellClass} />
              <td className={cellClass} />
              <td className={cellClass}>{formatAmount(totals.paid, i18n.language)}</td>
              <td className={cellClass}>{formatAmount(totals.interest, i18n.language)}</td>
              <td className={cellClass}>{formatAmount(totals.outstanding, i18n.language)}</td>
              <td className={cellClass} />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {t('reports.loanTotalsNote', {
          interest: formatETB(totals.interest, i18n.language),
        })}
      </p>
    </section>
  )
}
