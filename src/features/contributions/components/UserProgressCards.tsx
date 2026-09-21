import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/ui/EmptyState'
import {
  progressPercent,
  summarizeContributions,
  totalContributed,
  totalExpected,
} from '@/lib/calc'
import { formatETB } from '@/lib/format'
import type { Contribution, Target, UserProfile } from '@/lib/types'

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-brand-600"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  )
}

interface UserProgressCardsProps {
  users: UserProfile[]
  targets: Target[]
  contributions: Contribution[]
  year: number
}

export function UserProgressCards({ users, targets, contributions, year }: UserProgressCardsProps) {
  const { t, i18n } = useTranslation()

  const summaries = useMemo(() => {
    const nameById = new Map(users.map((user) => [user.uid, user.name || user.email]))
    return summarizeContributions(targets, contributions, year)
      .map((summary) => ({ ...summary, name: nameById.get(summary.userId) ?? summary.userId }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [users, targets, contributions, year])

  const expected = totalExpected(targets, year)
  const contributed = totalContributed(contributions, year)
  const overallPercent = progressPercent(expected > 0 ? contributed / expected : 0)

  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-900">
        {t('reports.progressTitle', { year })}
      </h3>

      {summaries.length === 0 ? (
        <div className="mt-3">
          <EmptyState message={t('reports.progressEmpty', { year })} />
        </div>
      ) : (
        <>
          <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-brand-700">{t('reports.progressTotals')}</p>
              <p className="text-xs font-semibold text-brand-700">
                {t('reports.percent', { percent: overallPercent })}
              </p>
            </div>
            <ProgressBar percent={overallPercent} />
            <p className="mt-2 text-xs text-brand-700">
              {formatETB(contributed, i18n.language)} / {formatETB(expected, i18n.language)}
            </p>
          </div>

          <ul className="mt-3 space-y-2">
            {summaries.map((summary) => {
              const percent = progressPercent(summary.progress)
              return (
                <li
                  key={summary.userId}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-medium text-slate-900">{summary.name}</p>
                    <p className="shrink-0 text-xs font-semibold text-slate-500">
                      {t('reports.percent', { percent })}
                    </p>
                  </div>
                  <ProgressBar percent={percent} />
                  <div className="mt-2 flex items-baseline justify-between gap-3 text-xs text-slate-600">
                    <span>
                      {formatETB(summary.contributed, i18n.language)} /{' '}
                      {formatETB(summary.expected, i18n.language)}
                    </span>
                    {summary.remaining > 0 ? (
                      <span>
                        {t('reports.remaining')} {formatETB(summary.remaining, i18n.language)}
                      </span>
                    ) : (
                      <span className="font-medium text-brand-700">{t('reports.fullyPaid')}</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
