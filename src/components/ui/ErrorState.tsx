import { useTranslation } from 'react-i18next'

interface ErrorStateProps {
  /** Resubscribes the underlying realtime query. */
  onRetry?: () => void
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  const { t } = useTranslation()

  return (
    <div role="alert" className="rounded-xl bg-red-50 px-4 py-4 text-center">
      <p className="text-sm text-red-700">{t('common.error')}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 min-h-11 rounded-lg border border-red-200 bg-white px-4 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
        >
          {t('common.retry')}
        </button>
      ) : null}
    </div>
  )
}
