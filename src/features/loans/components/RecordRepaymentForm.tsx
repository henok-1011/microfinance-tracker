import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/ui/EmptyState'
import { addRepayment, updateLoanStatus } from '@/features/loans/service'
import { describeUserError } from '@/features/users/errors'
import { isIsoDate, loanBalanceAt, loansWithBalance } from '@/lib/calc'
import { todayIso } from '@/lib/clock'
import { formatETB } from '@/lib/format'
import type { Loan, Repayment } from '@/lib/types'

const inputClass =
  'mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100'
const labelClass = 'block text-sm font-medium text-slate-700'

const PREVIEW_ID = '__preview__'

interface RecordRepaymentFormProps {
  loans: Loan[]
  repayments: Repayment[]
  today: string
}

export function RecordRepaymentForm({ loans, repayments, today }: RecordRepaymentFormProps) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const [loanId, setLoanId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => todayIso())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const openLoans = useMemo(
    () =>
      loansWithBalance(loans, repayments, today)
        .filter((entry) => !entry.balance.isPaid)
        .map((entry) => entry.loan),
    [loans, repayments, today],
  )

  // Keep the current selection visible even when the filter text excludes it.
  const options = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    const visible = trimmed
      ? openLoans.filter((loan) => loan.borrowerName.toLowerCase().includes(trimmed))
      : openLoans
    const selected = openLoans.find((loan) => loan.id === loanId)
    return selected && !visible.some((loan) => loan.id === selected.id)
      ? [selected, ...visible]
      : visible
  }, [openLoans, query, loanId])

  const selectedLoan = loans.find((loan) => loan.id === loanId) ?? null

  const amountValue = Number(amount)
  const hasAmount = amount.trim() !== '' && Number.isFinite(amountValue) && amountValue > 0

  /**
   * Replay the payment as a draft so the admin sees exactly how it would be
   * split (interest first, then principal) before committing.
   */
  const preview = useMemo(() => {
    if (!selectedLoan || !hasAmount || !isIsoDate(date)) return null
    const draft: Repayment = {
      id: PREVIEW_ID,
      loanId: selectedLoan.id,
      amount: amountValue,
      date,
      recordedBy: '',
      createdAt: '',
    }
    const balance = loanBalanceAt(selectedLoan, [...repayments, draft], date)
    return {
      balance,
      current: loanBalanceAt(selectedLoan, repayments, date),
      allocation: balance.allocations.find((entry) => entry.repaymentId === PREVIEW_ID) ?? null,
    }
  }, [selectedLoan, hasAmount, amountValue, date, repayments])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedLoan) {
      setError(t('admin.loans.errors.loanRequired'))
      return
    }
    if (!hasAmount) {
      setError(t('admin.loans.errors.amountRequired'))
      return
    }
    if (!isIsoDate(date)) {
      setError(t('admin.loans.errors.dateRequired'))
      return
    }

    const settlesLoan = preview?.balance.isPaid ?? false

    setSubmitting(true)
    setError(null)
    try {
      await addRepayment({ loanId: selectedLoan.id, amount: amountValue, date })
      if (settlesLoan && selectedLoan.status !== 'paid') {
        // Best-effort bookkeeping; the badge always derives its state from the balance.
        void updateLoanStatus(selectedLoan.id, 'paid').catch(() => undefined)
      }
      setAmount('')
      // Drop a settled loan from the picker; keep it for the next instalment.
      if (settlesLoan) setLoanId('')
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
      <h3 className="text-sm font-semibold text-slate-900">{t('admin.loans.repay.title')}</h3>

      {openLoans.length === 0 ? (
        <div className="mt-3">
          <EmptyState message={t('admin.loans.repay.empty')} />
        </div>
      ) : (
        <>
          <label className={`mt-3 ${labelClass}`}>
            {t('admin.loans.repay.search')}
            <input
              type="search"
              placeholder={t('admin.loans.repay.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={inputClass}
            />
          </label>

          <label className={`mt-3 ${labelClass}`}>
            {t('admin.loans.repay.loan')}
            <select
              required
              value={loanId}
              onChange={(event) => setLoanId(event.target.value)}
              className={inputClass}
            >
              <option value="">{t('admin.loans.repay.selectLoan')}</option>
              {options.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.borrowerName} — {loan.dueDate}
                </option>
              ))}
            </select>
          </label>

          <label className={`mt-3 ${labelClass}`}>
            {t('admin.loans.repay.amount')}
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
            {t('admin.loans.repay.date')}
            <input
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
            />
          </label>

          {preview ? (
            <dl className="mt-3 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <div className="flex justify-between gap-3">
                <dt>{t('admin.loans.repay.before')}</dt>
                <dd className="font-medium text-slate-900">
                  {formatETB(preview.current.totalOutstanding, i18n.language)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t('admin.loans.repay.interestPortion')}</dt>
                <dd className="font-medium text-slate-900">
                  {formatETB(preview.allocation?.interestPortion ?? 0, i18n.language)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t('admin.loans.repay.principalPortion')}</dt>
                <dd className="font-medium text-slate-900">
                  {formatETB(preview.allocation?.principalPortion ?? 0, i18n.language)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-slate-200 pt-1">
                <dt>{t('admin.loans.repay.after')}</dt>
                <dd className="font-semibold text-brand-700">
                  {formatETB(preview.balance.totalOutstanding, i18n.language)}
                </dd>
              </div>
              {preview.balance.isPaid ? (
                <p className="pt-1 font-medium text-brand-700">{t('admin.loans.repay.settled')}</p>
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
            {submitting ? t('common.saving') : t('admin.loans.repay.save')}
          </button>
        </>
      )}
    </form>
  )
}
