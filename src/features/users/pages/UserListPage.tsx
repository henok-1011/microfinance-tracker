import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/Spinner'
import { YearSelect } from '@/components/ui/YearSelect'
import { useAuth } from '@/features/auth/useAuth'
import { CreateUserForm } from '@/features/users/components/CreateUserForm'
import { EditUserForm } from '@/features/users/components/EditUserForm'
import { TargetInput } from '@/features/users/components/TargetInput'
import { describeUserError } from '@/features/users/errors'
import { useTargets, useUsers } from '@/features/users/hooks'
import { deleteUser } from '@/features/users/service'

export function UserListPage() {
  const { t } = useTranslation()
  const { role, user: currentUser } = useAuth()
  const { data: users, loading, error } = useUsers()
  const { data: targets } = useTargets()

  const [year, setYear] = useState(() => new Date().getFullYear())
  const [creating, setCreating] = useState(false)
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [confirmingUid, setConfirmingUid] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const isAdmin = role === 'admin'

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email)),
    [users],
  )

  function targetFor(uid: string): number | undefined {
    return targets.find((entry) => entry.userId === uid && entry.year === year)?.amount
  }

  async function handleDelete(uid: string) {
    setConfirmingUid(null)
    setActionError(null)
    try {
      await deleteUser(uid)
      if (editingUid === uid) setEditingUid(null)
    } catch (deleteError) {
      setActionError(describeUserError(deleteError, (key) => t(key)))
    }
  }

  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">{t('admin.users.title')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('admin.users.summary')}</p>
        </div>
        {isAdmin && !creating ? (
          <button
            type="button"
            onClick={() => {
              setCreating(true)
              setActionError(null)
            }}
            className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {t('admin.users.add')}
          </button>
        ) : null}
      </div>

      <div className="mt-4">
        <YearSelect value={year} onChange={setYear} />
      </div>

      {creating ? (
        <div className="mt-4">
          <CreateUserForm
            year={year}
            onCreated={() => setCreating(false)}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : null}

      {actionError ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {loading ? <Spinner label={t('common.loading')} /> : null}

        {!loading && error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t('common.error')}</p>
        ) : null}

        {!loading && !error && sortedUsers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            {t('admin.users.empty')}
          </p>
        ) : null}

        {sortedUsers.map((item) => {
          const targetAmount = targetFor(item.uid)
          const isSelf = item.uid === currentUser?.uid

          return (
            <article
              key={item.uid}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              {editingUid === item.uid ? (
                <EditUserForm
                  user={item}
                  onSaved={() => setEditingUid(null)}
                  onCancel={() => setEditingUid(null)}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.name || item.email}
                      </p>
                      <p className="truncate text-xs text-slate-500">{item.email}</p>
                      {item.phone ? (
                        <p className="mt-0.5 truncate text-xs text-slate-500">{item.phone}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          item.role === 'admin'
                            ? 'bg-brand-50 text-brand-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t(`admin.users.roles.${item.role}`)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          item.active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.active ? t('admin.users.active') : t('admin.users.inactive')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <TargetInput
                      key={`${item.uid}-${year}-${targetAmount ?? 'none'}`}
                      userId={item.uid}
                      year={year}
                      amount={targetAmount}
                      fallbackAmount={item.expectedYearly}
                      disabled={!isAdmin}
                    />
                  </div>

                  {isAdmin ? (
                    <div className="mt-3 flex items-center justify-end gap-2">
                      {confirmingUid === item.uid ? (
                        <>
                          <span className="mr-auto text-xs text-slate-600">
                            {t('admin.users.confirmDelete')}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.uid)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                          >
                            {t('common.delete')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingUid(null)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                          >
                            {t('common.cancel')}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingUid(item.uid)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                          >
                            {t('common.edit')}
                          </button>
                          {isSelf ? null : (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmingUid(item.uid)
                                setActionError(null)
                              }}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                            >
                              {t('common.delete')}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}
                </>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
