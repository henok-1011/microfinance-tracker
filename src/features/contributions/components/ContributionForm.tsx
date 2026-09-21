import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { YearSelect } from '@/components/ui/YearSelect'
import { addContribution } from '@/features/contributions/service'
import { describeUserError } from '@/features/users/errors'
import { isIsoDate, round2, summarizeUser, todayIso } from '@/lib/calc'
import { formatETB } from '@/lib/format'
import type { Contribution, Target, UserProfile } from '@/lib/types'

const inputClass =
  'mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100'
const labelClass = 'block text-sm font-medium text-slate-700'

interface ContributionFormProps {
  users: UserProfile[]
  targets: Target[]
  contributions: Contribution[]
  defaultYear: number
  /**
   * Reported whenever the year changes so the surrounding list keeps filtering
   * by the same year the form is recording into.
   */
  onYearChange: (year: number) => void
}

export function ContributionForm({
  users,
  targets,
  contributions,
  defaultYear,
  onYearChange,
}: ContributionFormProps) {
  const { t, i18n } = useTranslation()
  const [userId, setUserId] = useState('')
  const [formYear, setFormYear] = useState(defaultYear)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => todayIso())
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email)),
    [users],
  )

  const target = useMemo(
    () => targets.find((entry) => entry.userId === userId && entry.year === formYear)?.amount ?? 0,
    [targets, userId, formYear],
  )

  const summary = useMemo(
    () =>
      userId
        ? summarizeUser(
            userId,
            target,
            contributions.filter((entry) => entry.year === formYear),
          )
        : null,
    [userId, target, contributions, formYear],
  )

  const amountValue = Number(amount)
  const hasAmount = amount.trim() !== '' && Number.isFinite(amountValue) && amountValue > 0
  const projectedRemaining = summary && hasAmount ? round2(summary.remaining - amountValue) : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userId) {
      setError(t('admin.contributions.errors.userRequired'))
      return
    }
    if (!hasAmount) {
      setError(t('admin.contributions.errors.amountRequired'))
      return
    }
    if (!isIsoDate(date)) {
      setError(t('admin.contributions.errors.dateRequired'))
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await addContribution({
        userId,
        year: formYear,
        amount: amountValue,
        date,
        note: note.trim(),
      })
      // Keep the member and date so a batch of payments can be entered quickly.
      setAmount('')
      setNote('')
    } catch (submitError) {
      setError(describeUserError(submitError, (key) => t(key)))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-slate-900">{t('admin.contributions.add')}</h3>

      <label className={`mt-3 ${labelClass}`}>
        {t('admin.contributions.user')}
        <select
          required
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          className={inputClass}
        >
          <option value="">{t('admin.contributions.selectUser')}</option>
          {sortedUsers.map((option) => (
            <option key={option.uid} value={option.uid}>
              {option.name || option.email}
              {option.active ? '' : ` — ${t('admin.users.inactive')}`}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3">
        <YearSelect
          value={formYear}
          onChange={(next) => {
            setFormYear(next)
            onYearChange(next)
          }}
        />
      </div>

      <label className={`mt-3 ${labelClass}`}>
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

      <label className={`mt-3 ${labelClass}`}>
        {t('admin.contributions.date')}
        <input
          type="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className={inputClass}
        />
      </label>

      <label className={`mt-3 ${labelClass}`}>
        {t('admin.contributions.note')}
        <input
          type="text"
          maxLength={140}
          placeholder={t('admin.contributions.notePlaceholder')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={inputClass}
        />
      </label>

      {summary ? (
        <dl className="mt-3 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {summary.expected > 0 ? (
            <>
              <div className="flex justify-between gap-3">
                <dt>{t('admin.contributions.preview.target')}</dt>
                <dd className="font-medium text-slate-900">
                  {formatETB(summary.expected, i18n.language)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t('admin.contributions.preview.paid')}</dt>
                <dd className="font-medium text-slate-900">
                  {formatETB(summary.contributed, i18n.language)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t('admin.contributions.preview.remaining')}</dt>
                <dd className="font-medium text-slate-900">
                  {summary.remaining > 0
                    ? formatETB(summary.remaining, i18n.language)
                    : t('admin.contributions.preview.overpaid')}
                </dd>
              </div>
            </>
          ) : (
            <p>{t('admin.contributions.preview.noTarget', { year: formYear })}</p>
          )}

          {projectedRemaining !== null ? (
            <div className="flex justify-between gap-3 border-t border-slate-200 pt-1">
              <dt>{t('admin.contributions.preview.afterPayment')}</dt>
              <dd className="font-semibold text-brand-700">
                {projectedRemaining > 0
                  ? formatETB(projectedRemaining, i18n.language)
                  : t('admin.contributions.preview.overpaid')}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 min-h-11 w-full rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? t('common.saving') : t('admin.contributions.save')}
      </button>
    </form>
  )
}
