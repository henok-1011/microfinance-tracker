import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/ui/EmptyState'
import { latestContributions } from '@/lib/calc'
import { formatETB } from '@/lib/format'
import type { Contribution, UserProfile } from '@/lib/types'

interface RecentContributionsProps {
  users: UserProfile[]
  contributions: Contribution[]
  limit?: number
}

/** The newest payments overall, independent of the selected reporting period. */
export function RecentContributions({ users, contributions, limit = 5 }: RecentContributionsProps) {
  const { t, i18n } = useTranslation()

  const recent = useMemo(() => latestContributions(contributions, limit), [contributions, limit])

  const nameById = useMemo(
    () => new Map(users.map((user) => [user.uid, user.name || user.phone])),
    [users],
  )

  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-900">{t('reports.recent.title')}</h3>

      {recent.length === 0 ? (
        <div className="mt-3">
          <EmptyState message={t('reports.recent.empty')} />
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {recent.map((entry) => (
            <li key={entry.id} className="flex items-baseline justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {nameById.get(entry.userId) ?? entry.userId}
                </p>
                <p className="mt-0.5 flex items-baseline gap-2 text-xs text-slate-500">
                  <span className="shrink-0 tabular-nums">{entry.date}</span>
                  {entry.note ? <span className="truncate">{entry.note}</span> : null}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                {formatETB(entry.amount, i18n.language)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
