import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <section className="py-10 text-center">
      <h2 className="text-lg font-semibold text-slate-900">{t('notFound.title')}</h2>
      <p className="mt-2 text-sm text-slate-600">{t('notFound.message')}</p>
      <Link
        to="/"
        className="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        {t('notFound.goHome')}
      </Link>
    </section>
  )
}
