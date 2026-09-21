import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/ui/EmptyState'
import {
  progressPercent,
  round2,
  summarizeContributions,
  totalContributed,
  totalExpected,
} from '@/lib/calc'
import { formatAmount } from '@/lib/format'
import type { Contribution, Target, UserProfile } from '@/lib/types'

const cellClass = 'px-3 py-2 text-right tabular-nums'
const headClass = 'px-3 py-2 text-right font-medium'

interface ContributionsReportTableProps {
  users: UserProfile[]
  targets: Target[]
  contributions: Contribution[]
  year: number
}

export function ContributionsReportTable({
  users,
  targets,
  contributions,
  year,
}: ContributionsReportTableProps) {
  const { t, i18n } = useTranslation()

  const rows = useMemo(() => {
    const nameById = new Map(users.map((user) => [user.uid, user.name || user.email]))
    return summarizeContributions(targets, contributions, year)
      .map((summary) => ({ ...summary, name: nameById.get(summary.userId) ?? summary.userId }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [users, targets, contributions, year])

  const expected = totalExpected(targets, year)
  const contributed = totalContributed(contributions, year)
  const remaining = round2(expected - contributed)
  const overallPercent = progressPercent(expected > 0 ? contributed / expected : 0)

  if (rows.length === 0) {
    return <EmptyState message={t('reports.tableEmpty', { year })} />
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">
          {t('reports.contributionsTitle', { year })}
        </h3>
        <p className="shrink-0 text-xs text-slate-500">{t('reports.amountsInEtb')}</p>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {t('reports.columns.member')}
              </th>
              <th scope="col" className={headClass}>
                {t('reports.columns.target')}
              </th>
              <th scope="col" className={headClass}>
                {t('reports.columns.contributed')}
              </th>
              <th scope="col" className={headClass}>
                {t('reports.columns.remaining')}
              </th>
              <th scope="col" className={headClass}>
                {t('reports.columns.percent')}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.userId}>
                <th
                  scope="row"
                  className="max-w-[9rem] truncate px-3 py-2 text-left font-medium text-slate-900"
                >
                  {row.name}
                </th>
                <td className={`${cellClass} text-slate-700`}>
                  {formatAmount(row.expected, i18n.language)}
                </td>
                <td className={`${cellClass} text-slate-700`}>
                  {formatAmount(row.contributed, i18n.language)}
                </td>
                <td className={cellClass}>
                  {row.remaining > 0 ? (
                    <span className="text-slate-700">
                      {formatAmount(row.remaining, i18n.language)}
                    </span>
                  ) : (
                    <span className="font-medium text-brand-700">{t('reports.fullyPaid')}</span>
                  )}
                </td>
                <td className={`${cellClass} text-slate-700`}>
                  {t('reports.percent', { percent: progressPercent(row.progress) })}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
            <tr>
              <th scope="row" className="px-3 py-2 text-left">
                {t('reports.progressTotals')}
              </th>
              <td className={cellClass}>{formatAmount(expected, i18n.language)}</td>
              <td className={cellClass}>{formatAmount(contributed, i18n.language)}</td>
              <td className={cellClass}>{formatAmount(remaining, i18n.language)}</td>
              <td className={cellClass}>{t('reports.percent', { percent: overallPercent })}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
