import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { repaymentsLogCsvRows } from '@/features/reports/csv'
import { repaymentLog } from '@/features/reports/ledger'
import type { DateRange } from '@/lib/calc'
import { downloadCsv } from '@/lib/csv'
import { formatAmount } from '@/lib/format'
import { usePagination } from '@/lib/hooks/usePagination'
import type { Loan, Repayment } from '@/lib/types'

const cellClass = 'px-3 py-2 text-right tabular-nums'
const headClass = 'px-3 py-2 text-right font-medium'
const buttonClass =
  'min-h-11 shrink-0 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50'

interface RepaymentsLogTableProps {
  loans: Loan[]
  repayments: Repayment[]
  range: DateRange
  /** The date balances are struck at; must be at or after the period end. */
  asOf: string
}

/**
 * One row per repayment in the period, newest first.
 *
 * A payment appends a row instead of moving figures inside a loan's row, so the
 * period filter reads as what was actually collected between two dates. The
 * interest/principal split and the running balance come from the same
 * interest-first allocation the loan book uses.
 */
export function RepaymentsLogTable({ loans, repayments, range, asOf }: RepaymentsLogTableProps) {
  const { t, i18n } = useTranslation()

  const log = useMemo(
    () => repaymentLog(loans, repayments, range, asOf),
    [loans, repayments, range, asOf],
  )
  const pagination = usePagination(log.rows)

  function handleExport() {
    downloadCsv(
      `repayments-${range.from}_${range.to}.csv`,
      repaymentsLogCsvRows(
        log.rows,
        { repaid: log.repaid, interest: log.interest, principal: log.principal },
        {
          date: t('reports.columns.date'),
          enteredAt: t('reports.columns.enteredAt'),
          borrower: t('reports.columns.borrower'),
          paid: t('reports.columns.paid'),
          interest: t('reports.columns.interest'),
          principal: t('reports.columns.principal'),
          balanceAfter: t('reports.columns.balanceAfter'),
          totals: t('reports.repaymentTotals'),
        },
      ),
    )
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{t('reports.loanTitle')}</h3>
        {log.rows.length > 0 ? (
          <button type="button" onClick={handleExport} className={buttonClass}>
            {t('reports.export')}
          </button>
        ) : null}
      </div>

      <p className="mt-1 text-xs text-slate-500">
        {t('reports.period', { from: range.from, to: range.to })} · {t('reports.amountsInEtb')}
      </p>

      {log.rows.length === 0 ? (
        <div className="mt-3">
          <EmptyState message={t('reports.loanEmpty')} />
        </div>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    {t('reports.columns.date')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    {t('reports.columns.enteredAt')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    {t('reports.columns.borrower')}
                  </th>
                  <th scope="col" className={headClass}>
                    {t('reports.columns.paid')}
                  </th>
                  <th scope="col" className={headClass}>
                    {t('reports.columns.interest')}
                  </th>
                  <th scope="col" className={headClass}>
                    {t('reports.columns.principal')}
                  </th>
                  <th scope="col" className={headClass}>
                    {t('reports.columns.balanceAfter')}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {pagination.pageItems.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">{row.date}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                      {row.enteredAt || '—'}
                    </td>
                    <th
                      scope="row"
                      className="max-w-[9rem] truncate px-3 py-2 text-left font-medium text-slate-900"
                    >
                      {row.borrower || '—'}
                    </th>
                    <td className={`${cellClass} font-medium text-slate-900`}>
                      {formatAmount(row.amount, i18n.language)}
                    </td>
                    <td className={`${cellClass} text-slate-700`}>
                      {row.interestPortion === null
                        ? '—'
                        : formatAmount(row.interestPortion, i18n.language)}
                    </td>
                    <td className={`${cellClass} text-slate-700`}>
                      {row.principalPortion === null
                        ? '—'
                        : formatAmount(row.principalPortion, i18n.language)}
                    </td>
                    <td className={`${cellClass} text-slate-700`}>
                      {row.balanceAfter === null
                        ? '—'
                        : formatAmount(row.balanceAfter, i18n.language)}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                <tr>
                  <th scope="row" className="px-3 py-2 text-left">
                    {t('reports.repaymentTotals')}
                  </th>
                  <td className="px-3 py-2 text-left text-slate-600">
                    {t('reports.entryCount', { count: log.count })}
                  </td>
                  {/* The borrower column has no total. */}
                  <td className={cellClass} />
                  <td className={cellClass}>{formatAmount(log.repaid, i18n.language)}</td>
                  <td className={cellClass}>{formatAmount(log.interest, i18n.language)}</td>
                  <td className={cellClass}>{formatAmount(log.principal, i18n.language)}</td>
                  <td className={cellClass} />
                </tr>
              </tfoot>
            </table>
          </div>

          <Pagination
            pagination={pagination}
            label={t('reports.entryCount', { count: log.count })}
          />
        </>
      )}
    </section>
  )
}
