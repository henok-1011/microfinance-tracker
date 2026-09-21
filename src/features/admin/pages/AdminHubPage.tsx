import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

const CARDS = [
  {
    to: '/admin/users',
    title: 'admin.users.title',
    summary: 'admin.users.summary',
  },
  {
    to: '/admin/contributions',
    title: 'admin.contributions.title',
    summary: 'admin.contributions.summary',
  },
  {
    to: '/admin/loans',
    title: 'admin.loans.title',
    summary: 'admin.loans.summary',
  },
]

export function AdminHubPage() {
  const { t } = useTranslation()

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">{t('admin.title')}</h2>
      <p className="mt-1 text-sm text-slate-600">{t('admin.summary')}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-500"
          >
            <p className="text-sm font-semibold text-slate-900">{t(card.title)}</p>
            <p className="mt-1 text-xs text-slate-500">{t(card.summary)}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
