import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { describeUserError } from '@/features/users/errors'
import { updateUser } from '@/features/users/service'
import type { UserProfile } from '@/lib/types'

const inputClass =
  'mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100'
const labelClass = 'block text-sm font-medium text-slate-700'

interface EditUserFormProps {
  user: UserProfile
  onSaved: () => void
  onCancel: () => void
}

export function EditUserForm({ user, onSaved, onCancel }: EditUserFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone)
  const [active, setActive] = useState(user.active)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError(t('admin.users.errors.nameRequired'))
      return
    }

    setSaving(true)
    setError(null)
    try {
      await updateUser(user.uid, { name: name.trim(), phone: phone.trim(), active })
      onSaved()
    } catch (saveError) {
      setError(describeUserError(saveError, (key) => t(key)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="text-sm font-semibold text-slate-900">{t('admin.users.edit')}</h3>
      <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>

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
        {t('admin.users.phone')}
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={inputClass}
        />
      </label>

      <label className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          className="h-5 w-5 accent-brand-600"
        />
        {t('admin.users.active')}
      </label>

      {error ? (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 flex-1 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? t('common.saving') : t('common.save')}
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
