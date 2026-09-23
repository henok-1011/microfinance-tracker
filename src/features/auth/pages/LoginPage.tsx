import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'

import { LanguageToggle } from '@/components/LanguageToggle'
import { authErrorKey } from '@/features/auth/authErrors'
import { useAuth } from '@/features/auth/useAuth'
import { isPhoneValid } from '@/lib/phone'

type LocationState = { from?: string } | null

export function LoginPage() {
  const { t } = useTranslation()
  const { status, signIn } = useAuth()
  const location = useLocation()
  const from = (location.state as LocationState)?.from ?? '/'

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Caught here rather than at the provider: an unnormalised number would
    // otherwise be reported as a wrong password.
    if (!isPhoneValid(phone)) {
      setErrorKey('auth.errors.invalidPhone')
      return
    }

    setSubmitting(true)
    setErrorKey(null)
    try {
      await signIn(phone, password)
    } catch (error) {
      setErrorKey(authErrorKey(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col px-4">
      <header className="flex items-center justify-between py-4">
        <span className="text-sm font-semibold text-slate-900">{t('app.title')}</span>
        <LanguageToggle />
      </header>

      <main className="flex flex-1 items-center">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h1 className="text-xl font-semibold text-slate-900">{t('auth.signIn')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('auth.subtitle')}</p>

          <label className="mt-5 block text-sm font-medium text-slate-700">
            {t('auth.phone')}
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t('auth.phonePlaceholder')}
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            {t('auth.password')}
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          {errorKey ? (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {t(errorKey)}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 min-h-11 w-full rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? t('common.loading') : t('auth.signIn')}
          </button>
        </form>
      </main>
    </div>
  )
}
