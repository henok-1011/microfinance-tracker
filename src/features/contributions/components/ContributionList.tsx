import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/ui/EmptyState'
import { YearSelect } from '@/components/ui/YearSelect'
import { deleteContribution, updateContribution } from '@/features/contributions/service'
import { describeUserError } from '@/features/users/errors'
import { contributionsForYear, isIsoDate, type ContributionSort } from '@/lib/calc'
import { formatETB } from '@/lib/format'
import type { Contribution, UserProfile } from '@/lib/types'

const inputClass =
  'mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100'
const labelClass = 'block text-xs font-medium text-slate-600'

const SORTS: ContributionSort[] = ['newest', 'oldest', 'largest']

interface EditContributionRowProps {
  entry: Contribution
  onDone: () => void
  onCancel: () => void
}

function EditContributionRow({ entry, onDone, onCancel }: EditContributionRowProps) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState(String(entry.amount))
  const [year, setYear] = useState(entry.year)
  const [date, setDate] = useState(entry.date)
  const [note, setNote] = useState(entry.note)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = Number(amount)
    if (!(parsed > 0)) {
      setError(t('admin.contributions.errors.amountRequired'))
      return
    }
    if (!isIsoDate(date)) {
      setError(t('admin.contributions.errors.dateRequired'))
      return
    }

    setSaving(true)
    setError(null)
    try {
      await updateContribution(entry.id, { amount: parsed, year, date, note: note.trim() })
      onDone()
    } catch (saveError) {
      setError(describeUserError(saveError, (key) => t(key)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-brand-200 bg-white p-3">
      <h4 className="text-xs font-semibold text-slate-900">{t('admin.contributions.edit')}</h4>

      <div className="mt-2 flex flex-wrap items-end gap-3">
        <label className={`${labelClass} min-w-24 flex-1`}>
          {t('admin.contributions.amount')}
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          {t('common.year')}
          <div className="mt-1">
            <YearSelect value={year} onChange={setYear} />
          </div>
        </label>

        <label className={`${labelClass} min-w-36 flex-1`}>
          {t('admin.contributions.date')}
          <input
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className={`mt-2 ${labelClass}`}>
        {t('admin.contributions.note')}
        <input
          type="text"
          maxLength={140}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={inputClass}
        />
      </label>

      {error ? (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 flex-1 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

interface ContributionListProps {
  users: UserProfile[]
  contributions: Contribution[]
  year: number
  isAdmin: boolean
}

export function ContributionList({ users, contributions, year, isAdmin }: ContributionListProps) {
  const { t, i18n } = useTranslation()
  const [sort, setSort] = useState<ContributionSort>('newest')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const nameById = useMemo(
    () => new Map(users.map((user) => [user.uid, user.name || user.phone])),
    [users],
  )

  const rows = useMemo(
    () => contributionsForYear(contributions, year, sort),
    [contributions, year, sort],
  )

  async function handleDelete(id: string) {
    setConfirmingId(null)
    setActionError(null)
    try {
      await deleteContribution(id)
      if (editingId === id) setEditingId(null)
    } catch (deleteError) {
      setActionError(describeUserError(deleteError, (key) => t(key)))
    }
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">
            {t('admin.contributions.listTitle')}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {t('admin.contributions.count', { count: rows.length })}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-600">
          {t('admin.contributions.sortLabel')}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as ContributionSort)}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            {SORTS.map((option) => (
              <option key={option} value={option}>
                {t(`admin.contributions.sort.${option}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {actionError ? (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="mt-3">
          <EmptyState message={t('admin.contributions.empty', { year })} />
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((entry) => {
            if (editingId === entry.id) {
              return (
                <li key={entry.id}>
                  <EditContributionRow
                    entry={entry}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              )
            }

            return (
              <li
                key={entry.id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {nameById.get(entry.userId) ?? entry.userId}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {entry.date}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900">
                    {formatETB(entry.amount, i18n.language)}
                  </p>
                </div>

                {isAdmin ? (
                  <div className="mt-2 flex items-center justify-end gap-2">
                    {confirmingId === entry.id ? (
                      <>
                        <span className="mr-auto text-xs text-slate-600">
                          {t('admin.contributions.confirmDelete')}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleDelete(entry.id)}
                          className="min-h-11 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                        >
                          {t('common.delete')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="min-h-11 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          {t('common.cancel')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(entry.id)
                            setActionError(null)
                          }}
                          className="min-h-11 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmingId(entry.id)
                            setActionError(null)
                          }}
                          className="min-h-11 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                        >
                          {t('common.delete')}
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
