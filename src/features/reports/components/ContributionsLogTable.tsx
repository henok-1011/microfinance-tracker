import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { contributionsLogCsvRows } from '@/features/reports/csv'
import { contributionLog } from '@/features/reports/ledger'
import type { DateRange } from '@/lib/calc'
import { downloadCsv } from '@/lib/csv'
import { formatAmount } from '@/lib/format'
import { usePagination } from '@/lib/hooks/usePagination'
import type { Contribution, Target, UserProfile } from '@/lib/types'

const cellClass = 'px-3 py-2 text-right tabular-nums'
const headClass = 'px-3 py-2 text-right font-medium'
const buttonClass =
  'min-h-11 shrink-0 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50'

interface ContributionsLogTableProps {
  contributions: Contribution[]
  users: UserProfile[]
  targets: Target[]
  range: DateRange
}

/**
 * One row per contribution in the period, newest first.
 *
 * This is a transaction log: a new payment appends a row rather than moving a
 * figure inside an existing one, so the period filter reads as what was actually
 * paid between two dates. Per-member progress lives on Home.
 */
export function ContributionsLogTable({
  contributions,
  users,
  targets,
  range,
}: ContributionsLogTableProps) {
  const { t, i18n } = useTranslation()

  const log = useMemo(
    () => contributionLog(contributions, users, targets, range),
    [contributions, users, targets, range],
  )
  const pagination = usePagination(log.rows)

  function handleExport() {
    downloadCsv(
      `contributions-${range.from}_${range.to}.csv`,
      contributionsLogCsvRows(log.rows, log.total, {
        date: t('reports.columns.date'),
        enteredAt: t('reports.columns.enteredAt'),
        member: t('reports.columns.member'),
        amount: t('reports.columns.amount'),
        left: t('reports.columns.leftYear', { year: log.targetYear }),
        note: t('reports.columns.note'),
        totals: t('reports.totals'),
      }),
    )
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{t('reports.contributionsTitle')}</h3>
        {log.rows.length > 0 ? (
          <button type="button" onClick={handleExport} className={buttonClass}>
            {t('reports.export')}
          </button>
        ) : null}
      </div>

      <p className="mt-1 text-xs text-slate-500">
        {t('reports.period', { from: range.from, to: range.to })} · {t('reports.amountsInEtb')}
      </p>

      {log.rows.length > 0 ? (
        <p className="mt-0.5 text-xs text-slate-500">
          {t('reports.leftNote', { year: log.targetYear })}
        </p>
      ) : null}

      {log.rows.length === 0 ? (
        <div className="mt-3">
          <EmptyState message={t('reports.contributionsEmpty')} />
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
                    {t('reports.columns.member')}
                  </th>
                  <th scope="col" className={headClass}>
                    {t('reports.columns.amount')}
                  </th>
                  <th scope="col" className={headClass}>
                    {t('reports.columns.leftYear', { year: log.targetYear })}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    {t('reports.columns.note')}
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
                      {row.name}
                    </th>
                    <td className={`${cellClass} font-medium text-slate-900`}>
                      {formatAmount(row.amount, i18n.language)}
                    </td>
                    <td className={`${cellClass} text-slate-700`}>
                      {row.leftAfter === null ? '—' : formatAmount(row.leftAfter, i18n.language)}
                    </td>
                    <td className="max-w-[9rem] truncate px-3 py-2 text-slate-500">
                      {row.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                <tr>
                  <th scope="row" className="px-3 py-2 text-left">
                    {t('reports.totals')}
                  </th>
                  <td className="px-3 py-2 text-left text-slate-600">
                    {t('reports.entryCount', { count: log.count })}
                  </td>
                  <td className={cellClass} />
                  <td className={cellClass}>{formatAmount(log.total, i18n.language)}</td>
                  {/* Remainders belong to different members, so they cannot be summed. */}
                  <td className={cellClass} />
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
