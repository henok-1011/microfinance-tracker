import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { addLoan } from '@/features/loans/service'
import { describeUserError } from '@/features/users/errors'
import { compareIso, isIsoDate, loanBalanceAt, todayIso } from '@/lib/calc'
import { formatETB } from '@/lib/format'
import type { Loan } from '@/lib/types'

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100'
const labelClass = 'block text-sm font-medium text-slate-700'

export function AddLoanForm() {
  const { t, i18n } = useTranslation()
  const [borrowerName, setBorrowerName] = useState('')
  const [borrowerPhone, setBorrowerPhone] = useState('')
  const [principal, setPrincipal] = useState('')
  const [ratePct, setRatePct] = useState('')
  const [startDate, setStartDate] = useState(() => todayIso())
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const principalValue = Number(principal)
  const rateValue = Number(ratePct)
  const hasPrincipal =
    principal.trim() !== '' && Number.isFinite(principalValue) && principalValue > 0
  const hasRate = ratePct.trim() !== '' && Number.isFinite(rateValue) && rateValue >= 0
  const datesUsable =
    isIsoDate(startDate) && isIsoDate(dueDate) && compareIso(dueDate, startDate) >= 0

  // Project the loan to its due date so the admin sees principal + interest up front.
  const projected = useMemo(() => {
    if (!hasPrincipal || !hasRate || !datesUsable) return null
    const draft: Loan = {
      id: 'draft',
      borrowerName,
      borrowerPhone,
      principal: principalValue,
      annualRatePct: rateValue,
      startDate,
      dueDate,
      status: 'active',
      createdBy: '',
      createdAt: '',
    }
    return loanBalanceAt(draft, [], dueDate)
  }, [
    hasPrincipal,
    hasRate,
    datesUsable,
    borrowerName,
    borrowerPhone,
    principalValue,
    rateValue,
    startDate,
    dueDate,
  ])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!borrowerName.trim()) {
      setError(t('admin.loans.errors.borrowerRequired'))
      return
    }
    if (!hasPrincipal) {
      setError(t('admin.loans.errors.principalRequired'))
      return
    }
    if (!hasRate) {
      setError(t('admin.loans.errors.rateInvalid'))
      return
    }
    if (!isIsoDate(startDate)) {
      setError(t('admin.loans.errors.startRequired'))
      return
    }
    if (!isIsoDate(dueDate)) {
      setError(t('admin.loans.errors.dueRequired'))
      return
    }
    if (compareIso(dueDate, startDate) < 0) {
      setError(t('admin.loans.errors.dueBeforeStart'))
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await addLoan({
        borrowerName: borrowerName.trim(),
        borrowerPhone: borrowerPhone.trim(),
        principal: principalValue,
        annualRatePct: rateValue,
        startDate,
        dueDate,
      })
      setBorrowerName('')
      setBorrowerPhone('')
      setPrincipal('')
      setRatePct('')
      setStartDate(todayIso())
      setDueDate('')
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
      <h3 className="text-sm font-semibold text-slate-900">{t('admin.loans.add')}</h3>

      <label className={`mt-3 ${labelClass}`}>
        {t('admin.loans.borrower')}
        <input
          required
          value={borrowerName}
          onChange={(event) => setBorrowerName(event.target.value)}
          className={inputClass}
        />
      </label>

      <label className={`mt-3 ${labelClass}`}>
        {t('admin.loans.phone')}
        <input
          type="tel"
          value={borrowerPhone}
          onChange={(event) => setBorrowerPhone(event.target.value)}
          className={inputClass}
        />
      </label>

      <label className={`mt-3 ${labelClass}`}>
        {t('admin.loans.principal')}
        <input
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          required
          value={principal}
          onChange={(event) => setPrincipal(event.target.value)}
          className={inputClass}
        />
      </label>

      <label className={`mt-3 ${labelClass}`}>
        {t('admin.loans.rate')}
        <input
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          required
          value={ratePct}
          onChange={(event) => setRatePct(event.target.value)}
          className={inputClass}
        />
      </label>

      <div className="mt-3 flex gap-3">
        <label className={`${labelClass} flex-1`}>
          {t('admin.loans.startDate')}
          <input
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className={`${labelClass} flex-1`}>
          {t('admin.loans.dueDate')}
          <input
            type="date"
            required
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {projected ? (
        <dl className="mt-3 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <div className="flex justify-between gap-3">
            <dt>{t('admin.loans.preview.interest')}</dt>
            <dd className="font-medium text-slate-900">
              {formatETB(projected.interestAccrued, i18n.language)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-slate-200 pt-1">
            <dt>{t('admin.loans.preview.totalDue')}</dt>
            <dd className="font-semibold text-brand-700">
              {formatETB(projected.totalOutstanding, i18n.language)}
            </dd>
          </div>
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
        className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? t('common.saving') : t('admin.loans.save')}
      </button>
    </form>
  )
}
