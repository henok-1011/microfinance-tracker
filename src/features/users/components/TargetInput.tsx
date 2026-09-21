import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { describeUserError } from '@/features/users/errors'
import { setYearlyTarget } from '@/features/users/service'

interface TargetInputProps {
  userId: string
  year: number
  /** Stored target for this year, or undefined when the admin has not set one yet. */
  amount?: number
  /** Profile default, shown as a placeholder hint. */
  fallbackAmount?: number
  disabled?: boolean
}

/**
 * Inline editor for `targets/{userId}_{year}`. Callers pass a `key` that includes
 * the stored amount so a successful save remounts the field with the new value.
 */
export function TargetInput({
  userId,
  year,
  amount,
  fallbackAmount,
  disabled = false,
}: TargetInputProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState(amount === undefined ? '' : String(amount))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = Number(value)
  const isValid = value.trim() !== '' && Number.isFinite(parsed) && parsed >= 0
  const isDirty = isValid && parsed !== (amount ?? 0)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid) {
      setError(t('admin.users.errors.invalidTarget'))
      return
    }

    setSaving(true)
    setError(null)
    try {
      await setYearlyTarget(userId, year, parsed)
    } catch (saveError) {
      setError(describeUserError(saveError, (key) => t(key)))
    } finally {
      setSaving(false)
    }
  }

  if (disabled) {
    return (
      <p className="text-xs text-slate-600">
        <span className="font-medium text-slate-500">
          {t('admin.users.targetForYear', { year })}
        </span>{' '}
        {amount ?? fallbackAmount ?? 0}
      </p>
    )
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <label className="min-w-0 flex-1 text-xs font-medium text-slate-600">
          {t('admin.users.targetForYear', { year })}
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder={fallbackAmount !== undefined ? String(fallbackAmount) : '0'}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <button
          type="submit"
          disabled={!isDirty || saving}
          className="min-h-11 shrink-0 rounded-lg border border-brand-600 px-3 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:border-slate-200 disabled:text-slate-400"
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </form>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
