import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/useAuth'
import { ContributionForm } from '@/features/contributions/components/ContributionForm'
import { ContributionList } from '@/features/contributions/components/ContributionList'
import { useContributions } from '@/features/contributions/hooks'
import { useTargets, useUsers } from '@/features/users/hooks'

export function ContributionsPage() {
  const { t } = useTranslation()
  const { role } = useAuth()
  const { data: users, loading: usersLoading, error: usersError } = useUsers()
  const { data: targets } = useTargets()
  const {
    data: contributions,
    loading: contributionsLoading,
    error: contributionsError,
  } = useContributions()

  const [year, setYear] = useState(() => new Date().getFullYear())

  const loading = usersLoading || contributionsLoading
  const error = usersError ?? contributionsError

  return (
    <section>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{t('admin.contributions.title')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('admin.contributions.summary')}</p>
      </div>

      {loading ? <Spinner label={t('common.loading')} /> : null}

      {!loading && error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {t('common.error')}
        </p>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="mt-4">
            <ContributionForm
              users={users}
              targets={targets}
              contributions={contributions}
              defaultYear={year}
              onYearChange={setYear}
            />
          </div>

          <div className="mt-6">
            <ContributionList
              users={users}
              contributions={contributions}
              year={year}
              isAdmin={role === 'admin'}
            />
          </div>
        </>
      ) : null}
    </section>
  )
}
