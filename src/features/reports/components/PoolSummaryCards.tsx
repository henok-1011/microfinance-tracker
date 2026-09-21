import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { summarizePool, todayIso } from '@/lib/calc'
import { formatETB } from '@/lib/format'
import type { Contribution, Loan, Repayment, Target } from '@/lib/types'

interface PoolSummaryCardsProps {
  targets: Target[]
  contributions: Contribution[]
  loans: Loan[]
  repayments: Repayment[]
  year: number
}

export function PoolSummaryCards({
  targets,
  contributions,
  loans,
  repayments,
  year,
}: PoolSummaryCardsProps) {
  const { t, i18n } = useTranslation()

  // Loans and repayments are all-time; only targets and contributions are year-scoped.
  const pool = useMemo(
    () => summarizePool(targets, contributions, loans, repayments, todayIso(), year),
    [targets, contributions, loans, repayments, year],
  )

  const stats = [
    { label: t('reports.pool.cashOnHand'), value: pool.cashOnHand },
    { label: t('reports.pool.outstandingContributions'), value: pool.outstandingContributions },
    { label: t('reports.pool.loanBookOutstanding'), value: pool.loanBookOutstanding },
    { label: t('reports.pool.projectedPool'), value: pool.projectedPool },
    { label: t('reports.pool.interestEarned'), value: pool.interestEarned },
  ]

  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-900">{t('reports.pool.title')}</h3>

      <dl className="mt-3 grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <dt className="text-[11px] text-slate-500">{stat.label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900">
              {formatETB(stat.value, i18n.language)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
