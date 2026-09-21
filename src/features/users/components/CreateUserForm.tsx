import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { describeUserError } from '@/features/users/errors'
import { createUser, setYearlyTarget } from '@/features/users/service'

const inputClass =
  'mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100'
const labelClass = 'block text-sm font-medium text-slate-700'

interface CreateUserFormProps {
  year: number
  onCreated: () => void
  onCancel: () => void
}

export function CreateUserForm({ year, onCreated, onCancel }: CreateUserFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [targetInput, setTargetInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !email.trim() || !password) {
      setError(t('admin.users.errors.required'))
      return
    }

    const parsed = Number(targetInput)
    const expectedYearly = Number.isFinite(parsed) && parsed > 0 ? parsed : 0

    setSubmitting(true)
    setError(null)
    try {
      const { uid } = await createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        expectedYearly,
      })

      if (expectedYearly > 0) {
        try {
          // Seed the selected year's target so the user shows up in contributions reports.
          await setYearlyTarget(uid, year, expectedYearly)
        } catch {
          // The account exists, so keep going — the admin can set the target from the list.
        }
      }

      onCreated()
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
      <h3 className="text-sm font-semibold text-slate-900">{t('admin.users.create')}</h3>

      <label className={`mt-3 ${labelClass}`}>
        {t('admin.users.name')}
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
      </label>

      <label className={`mt-3 ${labelClass}`}>
        {t('admin.users.email')}
        <input
          type="email"
          autoComplete="off"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </label>

      <label className={`mt-3 ${labelClass}`}>
        {t('admin.users.password')}
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </label>

      <label className={`mt-3 ${labelClass}`}>
        {t('admin.users.phone')}
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={inputClass}
        />
      </label>

      <label className={`mt-3 ${labelClass}`}>
        {t('admin.users.targetForYear', { year })}
        <input
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          placeholder="0"
          value={targetInput}
          onChange={(event) => setTargetInput(event.target.value)}
          className={inputClass}
        />
      </label>

      {error ? (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 flex-1 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? t('common.saving') : t('admin.users.create')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
