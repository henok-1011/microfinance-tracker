import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

function ErrorFallback({ error }: { error: Error }) {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col items-center justify-center px-4">
      <div
        role="alert"
        className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h1 className="text-base font-semibold text-slate-900">{t('errors.boundary.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('errors.boundary.message')}</p>
        <p className="mt-2 break-words rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {error.message}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 min-h-11 w-full rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          {t('errors.boundary.reload')}
        </button>
      </div>
    </div>
  )
}

interface ErrorBoundaryState {
  error: Error | null
}

/** Catches render-time crashes so a broken screen cannot blank the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (error) return <ErrorFallback error={error} />
    return this.props.children
  }
}
